const express = require("express");
const { 
    sendGroupInvitation, 
    acceptInvitation, 
    getGroups,
    addMemberToGroup,
    updateMemberLocation,
    getMemeberLocation,
    deleteGroup,
    deleteGroupMembers,
    createProfile
} = require("../controllers/userController");
const { verifyToken,isRegistered } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/createProfile",verifyToken,isRegistered,createProfile);
router.post("/send-invitation",verifyToken,sendGroupInvitation);
router.post("/accept-invitation",verifyToken,acceptInvitation);
router.get("/getGroups",verifyToken,getGroups);
router.post("/add-member/:group_id",addMemberToGroup);
router.delete("/deleteGroup-member",verifyToken,deleteGroupMembers);
router.delete("/delete-group",verifyToken,deleteGroup);
router.post("/member-location",updateMemberLocation);
router.get("/getMember-location",getMemeberLocation);

module.exports = router;