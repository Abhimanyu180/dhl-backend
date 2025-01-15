const { v2: cloudinary } = require('cloudinary');
const fs = require("fs");
require('dotenv').config();

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

exports.uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath){
            throw new Error('File path is required');
        }
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully
        console.log("File uploaded successfully on clodinary",response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);  // Remove the locally saved file
        console.error("Error uploading photo to Cloudinary:", error.message);
        throw new Error(error.message); // Throw error to be handled in controller
    }
}