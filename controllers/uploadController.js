
exports.uploadImage = async (req, res) =>{
    try {
        const file = req.file;
        if(!file){
            return res.status(400).json({message:'please upload the image'});
        }
    } catch (error) {
        
    }
}