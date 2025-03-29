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
    try {
        const limit = parseInt(req.query.limit) || 5;
        const lastBookId = req.query.lastBookId; // Get last book's ID from query

        const query = lastBookId ? { _id: { $lt: lastBookId } } : {}; // Fetch books after last ID

        const books = await Book.find(query)
            .sort({ _id: -1 }) // Get newest books first
            .limit(limit)
            .populate("user", "username profileImage");

        res.status(200).json({ books });
    } catch (error) {
        console.log("Error fetching books", error);
        res.status(500).json({ message: error.message });
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