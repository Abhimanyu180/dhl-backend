const { User,Group } = require("../models/userModel");
const upload = require("../middleware/multer");
const fs = require("fs");
const { uploadOnCloudinary } = require("../services/cloudinary");
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

      if(user.name != null && user.photo != null){
        user.isProfileSetupComplete = true;
      }

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

exports.sendGroupInvitation = async (req, res) => {
  try {
    const user_id = req.user.userId;
    console.log("userId:", user_id);
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
    console.log("user:", user);
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

    const currentTime = new Date(); // Current timestamp for invitationTime
    const expiryTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

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
      const apkLink = "https://drive.google.com/file/d/1q4UgHZ7uJj5oTPJoP-HvauE-ah_v5iAS/view?usp=sharing"
      const acceptLink = `${baseURL}/groups/acceptInvitation/${invitationId}`;

      // Add member to the group
      newGroup.members.push({
        user: existingUser._id,
        invitationStatus: 0,
        member_role: role,
        invitationId,
      });

      // Send SMS to the invited member
      const smsData = {
        message: `📢 Hi ${name}!\n\nYou have been invited to join the group "${group_name}" by ${inviter_name}. \n\n👉 *Download the App*: ${apkLink}\n\n📅 Accept your invitation within 24 hours.\n\nThank you!`,
        language: "english",
        route: "q",
        numbers: phone,
    };
    

      try {
        await axios.post("https://www.fast2sms.com/dev/bulkV2", smsData, {
          headers: { Authorization: apiKey },
        });
        console.log("SMS sent successfully.");
      } catch (error) {
        console.error("Error sending SMS:", error.message);
      }

      // Update invitationTime, expiryTime, and pendingGroupIds
      existingUser.pendingGroupIds = existingUser.pendingGroupIds || [];
      const pendingGroupData = {
        groupId: newGroup._id,
        invitationTime: currentTime,
        expiryTime,
      };
      if (
        !existingUser.pendingGroupIds.some(
          (pending) => pending.groupId.toString() === newGroup._id.toString()
        )
      ) {
        existingUser.pendingGroupIds.push(pendingGroupData);
      }
      await existingUser.save();
    }

    await newGroup.save();

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
    const invitedUser = await User.findById(user_id);
    const { group_id } = req.body;

    if (!group_id || !user_id) {
      return res
        .status(400)
        .json({ message: "Group ID and User ID are required." });
    }

    // Check if the invitation exists in the user's pendingGroupIds
    const pendingGroup = invitedUser.pendingGroupIds.find(
      (pg) => pg.groupId.toString() === group_id
    );

    if (!pendingGroup) {
      return res
        .status(202)
        .json({ message: "No pending invitation found for this group." });
    }

    // Check if the invitation has expired
    const currentTime = new Date();
    if (pendingGroup.expiryTime && pendingGroup.expiryTime < currentTime) {
      return res.status(202).json({
        message: "The invitation has expired. Ask the inviter to invite again.",
      });
    }

    // Find the group in the database
    const group = await Group.findById(group_id).populate("members.user");
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
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

    // Send SMS to the inviter when the member accepts the invitation
    const smsData = {
      message: `Hi ${member.user.name}, has accepted your invitation to join the group "${group.groupName}".`,
      language: "english",
      route: "q",
      numbers: group.inviter.phone,
    };

    try {
      await axios.post("https://www.fast2sms.com/dev/bulkV2", smsData, {
        headers: { Authorization: apiKey },
      });
      console.log("SMS sent successfully.");
    } catch (error) {
      console.error("Error sending SMS:", error.message);
    }

    // If the group is inactive, activate it and notify the inviter
    if (group.groupStatus === 0) {
      group.groupStatus = 1;

      const inviterSmsData = {
        message: `Hi ${group.inviter.name}, your group "${group.groupName}" has been created successfully.`,
        language: "english",
        route: "q",
        numbers: group.inviter.phone,
      };

      try {
        await axios.post("https://www.fast2sms.com/dev/bulkV2", inviterSmsData, {
          headers: { Authorization: apiKey },
        });
        console.log("SMS to inviter sent successfully.");
      } catch (error) {
        console.error("Error sending SMS to inviter:", error.message);
      }
    }

    const inviter_id = group.inviter.inviter_id;
    const invitingUser = await User.findById(inviter_id);

    // Add the group ID to the inviter's group field if not already present
    if (!invitingUser.group.includes(group._id)) {
      invitingUser.group.push(group._id);
      await invitingUser.save(); // Save the updated user document
    }

    // Save the updated group
    await group.save();

    // Update the user's group array and remove the pending group ID
    const user = await User.findByIdAndUpdate(
      user_id,
      {
        $addToSet: { group: group_id }, // Add group ID to user's group array
        $pull: { pendingGroupIds: { groupId: group_id } }, // Remove the group ID from pendingGroupIds
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Invitation accepted and group created successfully.",
      group: group_id,
      user: user,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};


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
      return res
        .status(200)
        .json({ message: "User is not a part of any groups.", groups: [] });
    }

    // Use aggregation to fetch groups, members, and inviter details
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
        $lookup: {
          from: "users",
          localField: "filteredMembers.user",
          foreignField: "_id",
          as: "membersDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "inviter.inviter_id",
          foreignField: "_id",
          as: "inviterDetails",
        },
      },
      {
        $addFields: {
          members: {
            $map: {
              input: "$filteredMembers",
              as: "member",
              in: {
                _id: "$$member.user",
                member_role: "$$member.member_role",
                invitationStatus: "$$member.invitationStatus",
                user: {
                  $ifNull: [
                    {
                      $first: {
                        $filter: {
                          input: "$membersDetails",
                          as: "memberDetail",
                          cond: { $eq: ["$$memberDetail._id", "$$member.user"] },
                        },
                      },
                    },
                    null,
                  ],
                },
              },
            },
          },
          inviter: {
            $arrayElemAt: ["$inviterDetails", 0],
          },
        },
      },
      {
        $project: {
          groupName: 1,
          groupStatus: 1,
          messages: 1,
          members: {
            user: 1,
            member_role: 1,
            invitationStatus: 1,
            name: 1,
            phone: 1,
            photo: 1,
          },
          inviter: {
            name: "$inviter.name",
            phone: "$inviter.phone",
            photo: "$inviter.photo",
          },
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

exports.getPendingGroups = async (req, res) => {
  const user_id = req.user.userId;
  try {
    // Fetch the user details
    const user = await User.findById(user_id);
    console.log("user:", user);

    const pendingGroupIds = user.pendingGroupIds;
    console.log("Pending Group Ids:", pendingGroupIds.length);

    if (!pendingGroupIds || pendingGroupIds.length === 0) {
      return res.status(200).json({ message: "No pending groups found" });
    }

    // Fetch group details for each pending groupId
    const structuredGroups = await Promise.all(
      pendingGroupIds.map(async (item) => {
        const group = await Group.findById(item.groupId); // Fetch group details
        return {
          groupId: item.groupId,
          groupName: group?.groupName || "Unknown Group",
          invitationTime: item.invitationTime,
          expiryTime: item.expiryTime,
        };
      })
    );

    return res.status(200).json({
      message: "Successfully fetched the pending group details",
      pendingGroups: structuredGroups,
    });
  } catch (error) {
    console.log("Failed to get the pending group details:", error.message);
    return res.status(500).json({ error: error.message });
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
    const user_id = req.user.userId;
    const {latitude,longitude} = req.body;
    if ( !latitude || !longitude) {
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
    const user_id = req.user.userId;
    const {memberUserId,group_id} = req.body;
    if(!memberUserId || !group_id){
      return res.status(400).json({message:"Group ID and member Id is required."});
    }
   // Check if the group exists
   const group = await Group.findById(group_id);
   if (!group) {
     return res.status(404).json({ message: "Group not found." });
   }
  const isAdmin = group.members.some(
    (member)=>member.user.toString() === user_id && member.member_role === 1
  );

  if (!isAdmin) {
    return res.status(202).json({ message: "Only group admins can see the location of the group members." });
  }
    const memberUser = await User.findById(memberUserId);
    // if (!memberUser || !memberUser.location || !memberUser.location.coordinates) {
    //   return res.status(202).json({ message: "Member has not set his location." });
    // }
    const [longitude, latitude] = memberUser.location.coordinates;
    if (longitude === 0 && latitude === 0) {
      return res.status(202).json({ message: "Member has not set their location in the database." });
    }
    return res.status(200).json({
      message: "Location retrieved successfully.",
      location: { latitude, longitude },
    });
  } catch (error) {
    console.error("Error retrieving location:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
}