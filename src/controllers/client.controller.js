import { Client } from '../models/client.model.js';
import { Vendor } from '../models/vendor.model.js';
import { Request } from '../models/request.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateAccessAndRefreshToken } from '../utils/generateTokens.js';
import { options } from '../constants.js';


// Register a new client
const registerClient = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body.data;

    // Check if client or Vendor  with the same email or username already exists
    const existingClient = await Client.findOne({ email});

    const existingVendor = await Vendor.findOne({email});

    if (existingClient || existingVendor) {
        throw new ApiError(409, "User with this email  already exists");
    }


    // Create a new client instance
    const client = await Client.create({
        fullName,
        email,
        password,
       
    })


    // Retrieve created client without sensitive fields
    const createdClient = await Client.findById(client._id).select("-password");

    if (!createdClient) {
        throw new ApiError(500, "Client registration failed");
    }
    else {
        res.status(201).json(new ApiResponse(201, createdClient, "Client registered successfully"));
    }

})


const loginClient = asyncHandler(async (req, res) => {
    const { email, password } = req.body.data;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }

    const client = await Client.findOne({ email });

    if (!client) {
        throw new ApiError(404, "Client does not exist. Please register.");
    }

    const isPasswordValid = await client.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid email or password");
    }


    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(client._id, Client);

    const loggedInClient = await Client.findById(client._id).select("-password -refreshToken");


    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            {
                client: loggedInClient,
                accessToken,
                refreshToken
            },
            "Logged in successfully."
        ));







});


const logoutClient = asyncHandler(async (req, res) => {
    const client = await Client.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        { new: true } //Return the updated document
    );

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});


const requestCreation = asyncHandler(async (req, res) => {

    const { requestTitle, requestDescription, requestImage, status, category, budget, attachments } = req.body;
    const clientId = req.user._id;
    const vendorId = null;

    const request = await Request.create({
        requestTitle,
        requestDescription,
        requestImage,
        clientId,
        vendorId,
        status,
        category,
        budget,
        attachments
    });


    // Now, add the request ID to the client's `requests` array
    await Client.findByIdAndUpdate(clientId, {
        $push: { requests: request._id }  // Push the new request's ID to the `requests` array
    });

    if (!request) {
        throw new ApiError(500, "Request creation failed");
    }
    else {
        res.status(201).json(new ApiResponse(201, request, "Request created successfully"));
    }






})



const requestUpdation = asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { requestTitle, requestDescription, requestImage, status, category, budget, attachments } = req.body;

    const request = await Request.findByIdAndUpdate
        (requestId, {
            requestTitle,
            requestDescription,
            requestImage,
            status,
            category,
            budget,
            attachments
        }, { new: true });

    if (!request) {
        throw new ApiError(500, "Request updation failed");
    }
    else {
        res.status(200).json(new ApiResponse(200, request, "Request updated successfully"));
    }


})

export { registerClient, loginClient, logoutClient, requestCreation };

