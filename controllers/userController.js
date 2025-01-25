const { User,Group } = require("../models/userModel");
const upload = require("../middleware/multer");
const fs = require("fs");
const { uploadOnCloudinary } = require("../services/cloudinary");
// const NotificationService = require("../services/notification");
const fast2sms = require('fast-two-sms');
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { resolve } = require("path");

exports.createProfile = async (req, res) => {
  try {
    // Use multer middleware to handle file upload
    upload.single("photo")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: "Failed to upload photo." });
      }

      const userId = req.user.userId;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required." });
      }

      // Find the user in the database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Check if a photo was uploaded
      let photoUrl;
      if (req.file) {
        const localFilePath = req.file.path; // Path to the uploaded file
        try {
          // Upload the photo to Cloudinary
          const uploadResponse = await uploadOnCloudinary(localFilePath);
          photoUrl = uploadResponse.secure_url; // Secure URL from Cloudinary

          // Delete the local file after upload
          fs.unlinkSync(localFilePath);
        } catch (uploadError) {
          console.error("Error uploading photo to Cloudinary:", uploadError);
          return res.status(500).json({ message: "Failed to upload photo." });
        }
      }

      // Update the user's profile
      user.name = name;
      user.photo = photoUrl;             // Save Cloudinary URL in the user's profile
      user.isProfileSetupComplete = true;

      // Save the updated user
      await user.save();

      return res.status(200).json({
        message: "Profile setup successfully.",
        user: { name: user.name, photo: user.photo }, // Return updated user info
      });
    });
  } catch (error) {
    console.error("Failed to setup profile:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// exports.sendGroupInvitation = async (req, res) => {
//   try {
//     const user_id = req.user.userId;
//     const { group_name, members, member_role } = req.body;

//     const apiKey = process.env.FAST2SMS_API_KEY;
//     const baseURL = process.env.BASE_URL;

//     if (
//       !group_name ||
//       !members ||
//       !Array.isArray(members) ||
//       members.length === 0
//     ) {
//       return res
//         .status(400)
//         .json({ message: "Group name, member role, and members are required." });
//     }

//     // Get the inviter's details
//     const user = await User.findById(user_id);
//     if (!user) {
//       return res.status(404).json({ message: "Inviter not found." });
//     }
//     const inviter_name = user.name;
//     const inviter_phone = user.phone;

//     // Create the group
//     const newGroup = new Group({
//       groupName: group_name,
//       members: [
//         {
//           user: user_id,
//           invitationStatus: 1,
//           member_role: 1,
//         },
//       ],
//       inviter: {
//         inviter_id: user_id,
//         name: inviter_name,
//         phone: inviter_phone,
//       },
//     });

//     // Update inviter role in User schema
//     user.role = 1;
//     await user.save();

//     // Add members to the group
//     const phoneNumbers = [];
//     for (const member of members) {
//       const { name, phone,role } = member;

//       if (!name || typeof name !== "string" || !phone || typeof phone !== "string") {
//         return res
//           .status(400)
//           .json({ message: "Each member must have a valid name and phone number." });
//       }

//       // Check if the member exists, or create a new user
//       let existingUser = await User.findOne({ phone });
//       if (!existingUser) {
//         existingUser = new User({ name, phone });
//         await existingUser.save();
//       }

//       const invitationId = uuidv4(); // Generate a unique ID for this invitation
//       const acceptLink = `${baseURL}/groups/acceptInvitation/${invitationId}`;
//       // Add member to the group
//       newGroup.members.push({
//         user: existingUser._id,
//         invitationStatus: 0,
//         member_role:role,
//         invitationId
//       });

//       // Collect phone numbers for SMS
//       phoneNumbers.push(phone);
//     }

//     await newGroup.save();

//     // Log phone numbers AFTER processing all members
//     console.log("Final phone numbers before sending SMS:", phoneNumbers);

//     const FinalPhoneNumbers = phoneNumbers.join(",");
//     console.log("Phone:-",FinalPhoneNumbers);
//     // Send SMS invitations
//     // if (phoneNumbers.length > 0) {
//     //   const message = `You have been invited to join the group "${group_name}". Click on the link to accept the invitation.`;
//     //   const smsData = {
//     //     authorization: apiKey,
//     //     message,
//     //     language: "english",
//     //     route: "q",
//     //     numbers: FinalPhoneNumbers, // Ensure numbers are strings and joined correctly
//     //   };

//     //   console.log("SMS Data being sent:", smsData);

//     //   try {
//     //     const response = await fast2sms.sendMessage(smsData);
//     //     console.log("SMS sent successfully:", response);
//     //   } catch (smsError) {
//     //     console.error("Error sending SMS:", smsError.message);
//     //     return res.status(500).json({ message: "Failed to send SMS invitations." });
//     //   }
//     // }

//     const message = `You have been invited to join the group "${group_name}". Accept your invitation here: ${acceptLink}`;
//     const smsData = {
//       message:message,
//       language: "english",
//       route:"q",
//       numbers:FinalPhoneNumbers
//     }
//     console.log("SMS DATA:",smsData);
//     axios.post("https://www.fast2sms.com/dev/bulkV2",smsData,{
//       headers:{
//         Authorization:apiKey
//       }
//     }).then((response)=>{
//       return res.status(200).json({
//         message:'Invitation sent successfully',
//         data:{
//           groupId:newGroup._id
//         }
//       });
//     }).catch((error)=>{
//       return res.status(402).json({message:"Error while sending the invitation:"});
      
//     })
//   } catch (error) {
//     console.error("Error creating group:", error.message);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

exports.sendGroupInvitation = async (req, res) => {
  try {
    const user_id = req.user.userId;
    const { group_name, members, member_role } = req.body;

    const apiKey = process.env.FAST2SMS_API_KEY;
    const baseURL = process.env.BASE_URL;

    if (
      !group_name ||
      !members ||
      !Array.isArray(members) ||
      members.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Group name, member role, and members are required." });
    }

    // Get the inviter's details
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "Inviter not found." });
    }
    const inviter_name = user.name;
    const inviter_phone = user.phone;

    // Create the group
    const newGroup = new Group({
      groupName: group_name,
      members: [
        {
          user: user_id,
          invitationStatus: 1,
          member_role: 1,
        },
      ],
      inviter: {
        inviter_id: user_id,
        name: inviter_name,
        phone: inviter_phone,
      },
    });

    // Update inviter role in User schema
    user.role = 1;
    await user.save();

    // Add members to the group and generate individual invitation links
    const phoneNumbers = [];
    const invitationMessages = [];
    for (const member of members) {
      const { name, phone, role } = member;

      if (!name || typeof name !== "string" || !phone || typeof phone !== "string") {
        return res
          .status(400)
          .json({ message: "Each member must have a valid name and phone number." });
      }

      // Check if the member exists, or create a new user
      let existingUser = await User.findOne({ phone });
      if (!existingUser) {
        existingUser = new User({ name, phone });
        await existingUser.save();
      }

      const invitationId = uuidv4(); // Generate a unique ID for this invitation
      const acceptLink = `${baseURL}/groups/acceptInvitation/${invitationId}`;

      // Add member to the group
      newGroup.members.push({
        user: existingUser._id,
        invitationStatus: 0,
        member_role: role,
        invitationId,
      });

      // Add groupId to the pendingGroupIds of the invited user
      existingUser.pendingGroupIds = existingUser.pendingGroupIds || [];
      if (!existingUser.pendingGroupIds.includes(newGroup._id)) {
        existingUser.pendingGroupIds.push(newGroup._id);
        await existingUser.save();
      }

      // Collect phone numbers and their personalized messages for SMS
      phoneNumbers.push(phone);
      invitationMessages.push({
        phone,
        message: `You have been invited to join the group "${group_name}". Accept your invitation here: ${acceptLink}`,
      });
    }

    await newGroup.save();

    //  Sending SMS invitations for all members
    // for (const { phone, message } of invitationMessages) {
    //   const smsData = {
    //     message,
    //     language: "english",
    //     route: "q",
    //     numbers: phone,
    //   };
    //   try {
    //     console.log("Sending SMS to:", phone);
    //     await axios.post("https://www.fast2sms.com/dev/bulkV2", smsData, {
    //       headers: {
    //         Authorization: apiKey,
    //       },
    //     });
    //   } catch (error) {
    //     console.error(`Error sending SMS to ${phone}:`, error.message);
    //   }
    // }

    return res.status(200).json({
      message: "Invitation sent successfully",
      data: {
        groupId: newGroup._id,
      },
    });
  } catch (error) {
    console.error("Error creating group:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



exports.acceptInvitation = async (req, res) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  try {
    const user_id = req.user.userId;
    const { group_id } = req.body;
    if (!group_id || !user_id) {
      return res
        .status(400)
        .json({ message: "Group ID and User ID are required." });
    }
    //finding the group in the database
    const group = await Group.findById(group_id).populate("members.user");
    if (!group) {
      return res.status(404).json({ message: "Group not Found" });
    }
    // Find the member and update invitation status
    const member = group.members.find((m) => m.user._id.toString() === user_id);
    if (!member) {
      return res
        .status(404)
        .json({ message: "User is not a member of this group." });
    }

    if (member.invitationStatus === 1) {
      return res.status(400).json({
        message: "The invitation has already been accepted by this member.",
      });
    }
    // Update the invitation status to Accepted (1)
    member.invitationStatus = 1;

    //sending sms to the inviter when the member accepts the invitation
    const memberSmsOptions = {
      authorization:process.env.FAST2SMS_API_KEY,
      message: `Hi ${member.user.name}, has accepted your invitation to join the group "${group.groupName}".`,
      numbers: [group.inviter.phone],
    }

    const message =  `Hi ${member.user.name}, has accepted your invitation to join the group "${group.groupName}".`

    const smsData = {
      message : message,
      language : "english",
      route : "q",
      numbers : group.inviter.phone
    }
    console.log("SMS DATA:-",smsData);

    axios.post("https://www.fast2sms.com/dev/bulkV2",smsData,{
      headers:{
        Authorization:apiKey
      }
    }).then((response)=>{
      console.log("sent successfully");
    }).catch((error)=>{
      console.log("error");
    })


    if(group.groupStatus === 0){
      group.groupStatus = 1;

      //sending sms to the inviter when the group is accepted
      const iniviterSmsOptions = {
        authorization:process.env.FAST2SMS_API_KEY,
        message: `Hi, ${group.inviter.name} your group "${group.groupName}" has been created successfully.`,
        numbers: [group.inviter.phone],
      }
      await fast2sms.sendMessage(iniviterSmsOptions);
    }
    
    const inviter_id = group.inviter.inviter_id;

    const invitingUser = await User.findById(inviter_id);

    // Add the group ID to the inviter's group field if not already present
    if (!invitingUser.group.includes(group._id)) {
      invitingUser.group.push(group._id);
      await invitingUser.save(); // Save the updated user document
    }

    await group.save();


     // Update the user's group array
     const user = await User.findByIdAndUpdate(
      user_id,
      {
        $addToSet: { group: group_id }, // Add group ID to user's group array
        $pull: { pendingGroupIds: group_id }, // Remove the group ID from pendingGroupIds
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res
      .status(200)
      .json({ 
        message: "Invitation accepted and group created successfully." ,
        group: group_id,
        user: user,
      });
  } catch (error) {
    console.error("Error accepting invitation:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

// exports.acceptInvitation = async (req, res) => {
//   try {
//     const { invitationId } = req.params;

//     // Find the group containing this invitation
//     const group = await Group.findOne({ "members.invitationId": invitationId });
//     if (!group) {
//       return res.status(404).json({ message: "Invitation not found." });
//     }

//     // Find the member in the group and update their status
//     const member = group.members.find((m) => m.invitationId === invitationId);
//     if (!member) {
//       return res.status(404).json({ message: "Member not found." });
//     }

//     if (member.invitationStatus === 1) {
//       return res.status(400).json({ message: "Invitation already accepted." });
//     }

//     member.invitationStatus = 1;
//     await group.save();

//     // Optionally notify the inviter
//     const inviter = group.inviter;
//     console.log(`Member ${member.user} accepted the invitation. Notify ${inviter.name}`);

//     return res.status(200).json({ message: "Invitation accepted successfully." });
//   } catch (error) {
//     console.error("Error accepting invitation:", error.message);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

exports.getGroups = async (req, res) => {
  try {
    const user_id = req.user.userId;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Find the user to get the group IDs
    const user = await User.findById(user_id, "group");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const groupIds = user.group;
    if (groupIds.length === 0) {
      return res.status(200).json({ message: "User is not a part of any groups.", groups: [] });
    }

    // Use aggregation to filter groups and members
    const groups = await Group.aggregate([
      {
        $match: {
          _id: { $in: groupIds },
          groupStatus: 1, // Only groups with groupStatus 1
        },
      },
      {
        $addFields: {
          filteredMembers: {
            $filter: {
              input: "$members",
              as: "member",
              cond: { $eq: ["$$member.invitationStatus", 1] }, // Only members with invitationStatus 1
            },
          },
        },
      },
      {
        $project: {
          groupName: 1,
          groupStatus: 1,
          inviter: 1,
          messages: 1,
          members: "$filteredMembers", // Include only filtered members
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      message: "Groups fetched successfully.",
      groups,
    });
  } catch (error) {
    console.error("Error fetching groups:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};


exports.deleteGroupMembers = async (req, res) => {
  try {
    // const userId = req.user.userId;             //inviter id
    const adminId = req.user.userId;

    const { group_id,user_id } = req.body;
    if (!group_id || !user_id ) {
      return res
        .status(400)
        .json({ message: "Group ID and user ID are required." });
    }
    // Find the group by ID
    const group = await Group.findById(group_id);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }
    if(adminId === user_id){
      // Remove the user from the group's members list
      group.members = group.members.filter(
        (member) => member.user.toString() !== user_id
    );

    await group.save();

    // Remove the group ID from the user's `group` field
    await User.findByIdAndUpdate(
      user_id,
      { $pull: { group: group_id } },
      { new: true }
    );
    return res.status(200).json({message:'Member removed successfully'});
    }
     // Find the member in the group's members list
     const admin = group.members.find(
      (member) => member.user.toString() === adminId
    );
    if (!admin || admin.member_role !== 1) {
      return res.status(403).json({ message: "Only admins can delete members." });
    }
    // Find the member in the group's members list
    const member = group.members.find(
      (member) => member.user.toString() === user_id
    );
    if (!member) {
      return res
        .status(404)
        .json({ message: "User is not a member of this group." });
    }
     // Check if the member is an admin
     if (member.member_role === 1) {
      return res
        .status(403)
        .json({ message: "Cannot remove an admin member." });
    }
   
    // Remove the user from the group's members list
    group.members = group.members.filter(
      (member) => member.user.toString() !== user_id
    );
    await group.save();

    // Remove the group ID from the user's `group` field
    await User.findByIdAndUpdate(
      user_id,
      { $pull: { group: group_id } },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Member removed from group successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

exports.deleteGroup = async (req,res) =>{
  try {
    const userId = req.user.userId;
    const {group_id} = req.body;
    if(!group_id){
      return res.status(400).json({message:"Group ID is required."});
    }
   // Check if the group exists
   const group = await Group.findById(group_id);
   if (!group) {
     return res.status(404).json({ message: "Group not found." });
   }
  const isAdmin = group.members.some(
    (member)=>member.user.toString() === userId && member.member_role === 1
  );

  if (!isAdmin) {
    return res.status(403).json({ message: "Only group admins can delete the group." });
  }

   await User.updateMany(
    { group: group_id },
    { $pull: { group: group_id } }
  );

  // Delete the group
  await Group.findByIdAndDelete(group_id);
  res.status(200).json({ message: "Group successfully deleted and user records updated." });
  } catch (error) {
    console.error("failed in deleting group:", error);
    res.status(500).json({ message: "Failed in deleting the group", error: error.message });
  }
}

// exports.updateGroupMember = async(req,res) =>{
//  try {
//    const {user_id} = req.params;
//    const {name,photo} = req.body; 
 
//    if(!user_id || !name || !photo){
//      return res.status(400).json({message:"User ID, name, and photo are required."});
//    }
//    const user = await User.findById(user_id);
//    if (!user) {
//      return res.status(404).json({ message: "User not found." });
//    }

//  } catch (error) {
  
//  }
// }

exports.addMemberToGroup = async(req,res) =>{
  try {
    const userId = req.user.userId;
    const { group_id } = req.body;
    if(!group_id){
      return res.status(400).json({message:"Group ID is required."});
    }
    const {member_name,member_phone,role }= req.body;

    //finding the group in the database
    const group = await Group.findById(group_id);
    if(!group){
      return res.status(404).json({message:"Group not found"});
    }
     // Checking if the logged-in user is an admin of the group
     const isAdmin = group.members.some(
      (member) => member.user.toString() === userId && member.member_role === 1
    );
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add new members to the group." });
    }

    //checking if user is already a member of the group or not
    const isUserAlreadyMember = group.members.some(
      (member) => member.user.toString() === member_phone
    );
    if (isUserAlreadyMember) {
      return res.status(400).json({ message: "User is already a member of the group." });
    }
    //add the new member to the group
    group.members.push({
      user:user_id,
      role:role,
      invitationStatus:0      //pending status
    })
    await group.save();

    //sending an sms invitation to the new member
    const smsOptions = {
      authorization:process.env.FAST2SMS_API_KEY,
      message: `Hi ${name}, you have been invited to join the group "${group_name}". Click on the link to accept the invitation.`,
      numbers: [phone],
    };
    await fast2sms.sendMessage(smsOptions);

    return res.status(200).json({message:"Invitation sent to new member successfully."});
  } catch (error) {
    console.log("Failed to send the invitation to the new member:",error.message);
    return res.status(500).json(error.message);
  }
};

exports.updateMemberLocation = async(req,res) =>{
  try {
    const {user_id,latitude,longitude} = req.body;
    if (!user_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const user = await User.findByIdAndUpdate(user_id);
    if(!user){
      return res.status(404).json({message:"User not found."});
    }
    user.location.coordinates = [longitude, latitude];
    await user.save();
    return res.status(200).json({ message: "Location updated successfully." });
  } catch (error) {
    console.error("Error updating location:", error.message);
    return res.status(500).json(error.message);
  }
}

exports.getMemeberLocation = async(req,res) =>{
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required." });
    }
    const user = await User.findById(user_id);
    if (!user || !user.location.coordinates) {
      return res.status(404).json({ message: "Location not found for the user." });
    }
    const [longitude, latitude] = user.location.coordinates;
    return res.status(200).json({
      message: "Location retrieved successfully.",
      location: { latitude, longitude },
    });
  } catch (error) {
    console.error("Error retrieving location:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
}