// ============================================================
// HONEYSHIELD
// RECOVERY ROUTES
// ============================================================

const express =
    require("express");

const crypto =
    require("crypto");

const router =
    express.Router();

const {
    supabase
} =
    require("../services/supabase");

const {
    sendRecoveryOTP,
    verifyRecoveryOTP
} =
    require("../services/otpService");


// ============================================================
// GENERATE SERVER-SIDE REQUEST ID
// ============================================================

function generateRequestId() {

    const randomPart =
        crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase();

    const timePart =
        Date.now()
            .toString()
            .slice(-8);

    return (
        `HS-${timePart}-${randomPart}`
    );

}


// ============================================================
// GET CLIENT IP
// ============================================================

function getClientIP(req) {

    const forwardedFor =
        req.headers[
            "x-forwarded-for"
        ];

    if (
        forwardedFor
    ) {

        return (
            forwardedFor
                .split(",")[0]
                .trim()
        );

    }

    return (
        req.socket.remoteAddress ||
        req.ip ||
        "UNKNOWN"
    );

}


// ============================================================
// POST /api/recovery/request
//
// Creates recovery request.
//
// IMPORTANT:
// User supplied email is NOT trusted.
// It must match the registered email stored
// for the username.
// ============================================================

router.post(
    "/request",
    async (req, res) => {

        try {

            const {
                username,
                contact_email,
                reason,
                verification_details
            } =
                req.body;


            // ------------------------------------------------
            // BASIC VALIDATION
            // ------------------------------------------------

            if (
                !username ||
                !username.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Username is required."

                    });

            }


            if (
                !contact_email ||
                !contact_email.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Contact email is required."

                    });

            }


            if (
                !reason ||
                !reason.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Recovery reason is required."

                    });

            }


            // ------------------------------------------------
            // EMAIL FORMAT
            // ------------------------------------------------

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailRegex.test(
                    contact_email.trim()
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please enter a valid email address."

                    });

            }


            const cleanUsername =
                username.trim();

            const cleanEmail =
                contact_email
                    .trim()
                    .toLowerCase();


            // ------------------------------------------------
            // FIND REGISTERED IDENTITY
            // ------------------------------------------------

            const {
                data:
                    identity,
                error:
                    identityError
            } =
                await supabase
                    .from(
                        "recovery_identities"
                    )
                    .select(
                        "username, registered_email, is_active"
                    )
                    .eq(
                        "username",
                        cleanUsername
                    )
                    .maybeSingle();


            if (
                identityError
            ) {

                console.error(
                    "Recovery identity lookup error:",
                    identityError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to verify account identity."

                    });

            }


            // ------------------------------------------------
            // DO NOT REVEAL WHETHER USERNAME EXISTS
            // ------------------------------------------------

            if (
                !identity ||
                identity.is_active !== true
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "The supplied account details could not be verified."

                    });

            }


            // ------------------------------------------------
            // EMAIL MUST MATCH REGISTERED EMAIL
            // ------------------------------------------------

            const registeredEmail =
                String(
                    identity.registered_email
                )
                    .trim()
                    .toLowerCase();


            if (
                cleanEmail !==
                registeredEmail
            ) {

                console.warn(
                    `⚠️ Recovery identity mismatch for username: ${cleanUsername}`
                );

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "The supplied account details could not be verified."

                    });

            }


            // ------------------------------------------------
            // CLIENT IP
            // ------------------------------------------------

            const ipAddress =
                getClientIP(
                    req
                );


            // ------------------------------------------------
            // GENERATE REQUEST ID
            // ------------------------------------------------

            const requestId =
                generateRequestId();


            // ------------------------------------------------
            // CREATE RECOVERY REQUEST
            // ------------------------------------------------

            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .insert([

                        {

                            request_id:
                                requestId,

                            username:
                                cleanUsername,

                            contact_email:
                                registeredEmail,

                            reason:
                                reason.trim(),

                            verification_details:
                                verification_details
                                    ? verification_details.trim()
                                    : null,

                            ip_address:
                                ipAddress,

                            user_agent:
                                req.headers[
                                    "user-agent"
                                ] || null,

                            status:
                                "PENDING"

                        }

                    ])
                    .select()
                    .single();


            if (
                error
            ) {

                console.error(
                    "Recovery request Supabase error:",
                    error
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to submit recovery request."

                    });

            }


            // ------------------------------------------------
            // SEND OTP
            // ------------------------------------------------

            try {

                const otpResult =
                    await sendRecoveryOTP({

                        requestId:
                            requestId,

                        username:
                            cleanUsername,

                        email:
                            registeredEmail

                    });


                // --------------------------------------------
                // UPDATE REQUEST STATUS
                // --------------------------------------------

                const {
                    error:
                        statusError
                } =
                    await supabase
                        .from(
                            "recovery_requests"
                        )
                        .update({

                            status:
                                "OTP_SENT"

                        })
                        .eq(
                            "request_id",
                            requestId
                        );


                if (
                    statusError
                ) {

                    console.error(
                        "Recovery OTP status update error:",
                        statusError
                    );

                }


                console.log(
                    `📧 Recovery verification started: ${requestId}`
                );


                return res
                    .status(201)
                    .json({

                        success:
                            true,

                        message:
                            "Recovery request created. A verification code has been sent to your registered email.",

                        request_id:
                            data.request_id,

                        status:
                            "OTP_SENT",

                        masked_email:
                            otpResult.maskedEmail,

                        expires_at:
                            otpResult.expiresAt

                    });


            } catch (
                otpError
            ) {

                console.error(
                    "Recovery OTP send error:",
                    otpError
                );


                // --------------------------------------------
                // REMOVE REQUEST IF OTP COULD NOT BE SENT
                // --------------------------------------------

                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .delete()
                    .eq(
                        "request_id",
                        requestId
                    );


                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Recovery request could not be created because the verification email could not be sent."

                    });

            }

        } catch (
            error
        ) {

            console.error(
                "Recovery request error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Internal server error."

                });

        }

    }
);


// ============================================================
// POST /api/recovery/verify-otp
// ============================================================

router.post(
    "/verify-otp",
    async (req, res) => {

        try {

            const {
                request_id,
                otp
            } =
                req.body;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (
                !request_id ||
                !String(
                    request_id
                ).trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Request ID is required."

                    });

            }


            if (
                !otp ||
                !/^\d{6}$/.test(
                    String(
                        otp
                    ).trim()
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please enter the 6-digit verification code."

                    });

            }


            const requestId =
                String(
                    request_id
                ).trim();


            // ------------------------------------------------
            // FIND RECOVERY REQUEST
            // ------------------------------------------------

            const {
                data:
                    recoveryRequest,
                error:
                    requestError
            } =
                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .select(
                        "request_id, username, status"
                    )
                    .eq(
                        "request_id",
                        requestId
                    )
                    .maybeSingle();


            if (
                requestError
            ) {

                console.error(
                    "Recovery request lookup error:",
                    requestError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to verify recovery request."

                    });

            }


            if (
                !recoveryRequest
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Recovery request not found."

                    });

            }


            // ------------------------------------------------
            // REQUEST MUST BE OTP_SENT
            // ------------------------------------------------

            if (
                recoveryRequest.status !==
                "OTP_SENT"
            ) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            `This recovery request cannot be verified because its current status is ${recoveryRequest.status}.`

                    });

            }


            // ------------------------------------------------
            // VERIFY OTP
            // ------------------------------------------------

            const result =
                await verifyRecoveryOTP({

                    requestId:
                        requestId,

                    otp:
                        String(
                            otp
                        ).trim()

                });


            if (
                !result.success
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            result.message

                    });

            }


            // ------------------------------------------------
            // MARK RECOVERY REQUEST VERIFIED
            // ------------------------------------------------

            const {
                data:
                    updatedRequest,
                error:
                    updateError
            } =
                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .update({

                        status:
                            "VERIFIED"

                    })
                    .eq(
                        "request_id",
                        requestId
                    )
                    .eq(
                        "status",
                        "OTP_SENT"
                    )
                    .select()
                    .single();


            if (
                updateError
            ) {

                console.error(
                    "Recovery verification status error:",
                    updateError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "OTP was verified, but recovery status could not be updated."

                    });

            }


            console.log(
                `✅ Recovery identity VERIFIED: ${requestId}`
            );


            return res.json({

                success:
                    true,

                message:
                    "Identity verification successful. Your request is now waiting for administrator review.",

                request_id:
                    updatedRequest.request_id,

                status:
                    updatedRequest.status

            });

        } catch (
            error
        ) {

            console.error(
                "Recovery OTP verification error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Internal server error."

                });

        }

    }
);


// ============================================================
// GET RECOVERY REQUEST STATUS
//
// Allows recovery page to check its own request status
// using the Request ID.
// ============================================================

router.get(
    "/request/:requestId",
    async (req, res) => {

        try {

            const requestId =
                String(
                    req.params.requestId || ""
                ).trim();


            if (
                !requestId
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Request ID is required."

                    });

            }


            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .select(
                        [
                            "request_id",
                            "username",
                            "status",
                            "created_at",
                            "reviewed_at",
                            "reviewed_by"
                        ].join(",")
                    )
                    .eq(
                        "request_id",
                        requestId
                    )
                    .maybeSingle();


            if (
                error
            ) {

                console.error(
                    "Recovery status lookup error:",
                    error
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to check recovery request."

                    });

            }


            if (
                !data
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Recovery request not found."

                    });

            }


            return res.json({

                success:
                    true,

                request:
                    data

            });

        } catch (
            error
        ) {

            console.error(
                "Recovery status error:",
                error
            );

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Internal server error."

                });

        }

    }
);


// ============================================================
// EXPORT
// ============================================================

module.exports =
    router;