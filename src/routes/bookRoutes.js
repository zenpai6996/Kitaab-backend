import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

//create book endpoint
router.post("/",protectRoute ,async (req,res) =>{
    try{
        const {title,caption,image,rating} =req.body;

        if(!title || !caption || !image || !rating){
            return res.status(400).json({message:"Please provide all fields"});
        }

        //upload image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        const imageUrl = uploadResponse.secure_url;

        //save to database
        const newBook = new Book({
            title,
            caption,
            image:imageUrl,
            rating,
            user:req.user._id
        })

        await newBook.save();

        res.status(201).json(newBook)

    }catch(error){
        console.log("Error creating book",error);
        res.status(500).json({message:error.message});
    }
})

//recommended books endpoint
//pagination => infinite scroll
router.get("/",protectRoute,async(req,res) =>{
   //example call:
   //const response = await fetch("http://localhost:3000/api/books?page=1&limit=5);
    try{

    const page = req.query.page || 1;
    const limit = req.query.limit || 2;
    const skip = ( page - 1 )*limit;

    const books = await Book.find()
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        .populate("user","username profileImage");//descendign order

    const total = await Book.countDocuments();
    res.send({
        books,
        currentPage:page,
        totalbooks:total,
        totalPages:Math.ceil(total/limit)
    });

   } catch (error){
       console.log("Error fetching books",error);
         res.status(500).json({message:error.message});
   }
});

//user recommendations
router.get("/user",protectRoute,async(req,res) =>{
    try{
        const books = await Book.find({user:req.user._id}).sort({createdAt:-1});
        res.json(books)
    }catch(error){
        console.error("Get user books error",error);
        res.status(500).json({message:error.message});
    }
});

//delete books endpoint
router.delete("/:id",protectRoute,async(req,res) =>{
   try{
         const book = await Book.findById(req.params.id);
         if(!book) return res.status(404).json({message:"Book not found"});

         //check if user is the creator of the recommendation
         if(book.user.toString() !== req.user._id.toString()){
                return res.status(401).json({message:"Unauthorized"});
         }

         //delete book image from cloudinary
         if(book.image && book.image.includes("cloudinary")){
             try{
                    const publicId = book.image.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(publicId);
             }catch(deleteError){
                 console.log("Error deleting image",deleteError);
             }
         }

         await book.deleteOne();

         res.json({message:"Book deleted successfully"});

   }catch(error){
        console.log("Error deleting book",error);
        res.status(500).json({message:error.message});
   }
});

export default router;