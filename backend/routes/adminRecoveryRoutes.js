// ============================================================
// HONEYSHIELD
// ADMIN RECOVERY ROUTES
// ============================================================

const express =
    require("express");

const router =
    express.Router();

const {
    supabase
} =
    require("../services/supabase");

const {
    unblockIP
} =
    require("../detectionService");


// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

function verifyAdmin(
    req,
    res,
    next
) {

    const adminKey =
        process.env.ADMIN_RECOVERY_KEY;

    const providedKey =
        req.headers["x-admin-key"];


    if (
        !adminKey
    ) {

        console.error(
            "ADMIN_RECOVERY_KEY is not configured."
        );

        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    "Admin recovery security is not configured."

            });

    }


    if (
        !providedKey ||
        providedKey !== adminKey
    ) {

        return res
            .status(401)
            .json({

                success:
                    false,

                message:
                    "Unauthorized administrator request."

            });

    }


    next();

}


// ============================================================
// GET ALL RECOVERY REQUESTS
// ============================================================

router.get(
    "/recovery-requests",
    verifyAdmin,
    async (req, res) => {

        try {

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
                            "id",
                            "request_id",
                            "username",
                            "contact_email",
                            "reason",
                            "verification_details",
                            "ip_address",
                            "user_agent",
                            "status",
                            "created_at",
                            "reviewed_at",
                            "reviewed_by"
                        ].join(",")
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    );


            if (
                error
            ) {

                console.error(
                    "Recovery request fetch error:",
                    error
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to load recovery requests."

                    });

            }


            return res.json({

                success:
                    true,

                count:
                    data.length,

                requests:
                    data

            });

        } catch (
            error
        ) {

            console.error(
                "Admin recovery GET error:",
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
// APPROVE RECOVERY REQUEST
//
// IMPORTANT:
// ONLY OTP-VERIFIED REQUESTS CAN BE APPROVED.
//
// PENDING  -> BLOCKED
// OTP_SENT -> BLOCKED
// VERIFIED -> ALLOWED
// APPROVED -> BLOCKED
// REJECTED -> BLOCKED
// ============================================================

router.post(
    "/recovery-requests/:requestId/approve",
    verifyAdmin,
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


            // ------------------------------------------------
            // FIND REQUEST
            // ------------------------------------------------

            const {
                data:
                    request,
                error:
                    findError
            } =
                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .select("*")
                    .eq(
                        "request_id",
                        requestId
                    )
                    .maybeSingle();


            if (
                findError
            ) {

                console.error(
                    "Recovery request lookup error:",
                    findError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to find recovery request."

                    });

            }


            if (
                !request
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
            // OTP VERIFICATION GATE
            // ------------------------------------------------

            if (
                request.status !==
                "VERIFIED"
            ) {

                return res
                    .status(403)
                    .json({

                        success:
                            false,

                        message:
                            "Recovery request cannot be approved until the user's identity is successfully verified by OTP.",

                        current_status:
                            request.status

                    });

            }


            // ------------------------------------------------
            // IP
            // ------------------------------------------------

            const ipAddress =
                request.ip_address;


            // ------------------------------------------------
            // UNBLOCK IP
            // ------------------------------------------------

            const wasUnblocked =
                unblockIP(
                    ipAddress
                );


            // ------------------------------------------------
            // ADMIN NAME
            // ------------------------------------------------

            const reviewedBy =
                req.headers[
                    "x-admin-name"
                ] ||
                "ADMIN";


            // ------------------------------------------------
            // UPDATE REQUEST
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
                            "APPROVED",

                        reviewed_at:
                            new Date()
                                .toISOString(),

                        reviewed_by:
                            String(
                                reviewedBy
                            ).slice(
                                0,
                                100
                            )

                    })
                    .eq(
                        "request_id",
                        requestId
                    )
                    .eq(
                        "status",
                        "VERIFIED"
                    )
                    .select()
                    .single();


            if (
                updateError
            ) {

                console.error(
                    "Recovery approval update error:",
                    updateError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "IP was processed, but recovery request status could not be updated."

                    });

            }


            console.log(
                `🛡️ Recovery APPROVED: ${requestId} | IP: ${ipAddress}`
            );


            return res.json({

                success:
                    true,

                message:
                    "Recovery request approved and IP unblock processed.",

                request:
                    updatedRequest,

                ip:
                    ipAddress,

                wasUnblocked

            });

        } catch (
            error
        ) {

            console.error(
                "Admin recovery approval error:",
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
// REJECT RECOVERY REQUEST
//
// REJECTION DOES NOT REQUIRE OTP VERIFICATION.
// Admin can reject suspicious requests at any stage.
//
// IMPORTANT:
// IP REMAINS BLOCKED.
// ============================================================

router.post(
    "/recovery-requests/:requestId/reject",
    verifyAdmin,
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


            // ------------------------------------------------
            // FIND REQUEST
            // ------------------------------------------------

            const {
                data:
                    request,
                error:
                    findError
            } =
                await supabase
                    .from(
                        "recovery_requests"
                    )
                    .select("*")
                    .eq(
                        "request_id",
                        requestId
                    )
                    .maybeSingle();


            if (
                findError
            ) {

                console.error(
                    "Recovery request lookup error:",
                    findError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to find recovery request."

                    });

            }


            if (
                !request
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
            // ONLY PENDING / OTP_SENT / VERIFIED CAN BE
            // REJECTED
            // ------------------------------------------------

            const allowedStatuses = [

                "PENDING",

                "OTP_SENT",

                "VERIFIED"

            ];


            if (
                !allowedStatuses.includes(
                    request.status
                )
            ) {

                return res
                    .status(409)
                    .json({

                        success:
                            false,

                        message:
                            `Request is already ${request.status}.`

                    });

            }


            // ------------------------------------------------
            // ADMIN NAME
            // ------------------------------------------------

            const reviewedBy =
                req.headers[
                    "x-admin-name"
                ] ||
                "ADMIN";


            // ------------------------------------------------
            // REJECT
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
                            "REJECTED",

                        reviewed_at:
                            new Date()
                                .toISOString(),

                        reviewed_by:
                            String(
                                reviewedBy
                            ).slice(
                                0,
                                100
                            )

                    })
                    .eq(
                        "request_id",
                        requestId
                    )
                    .in(
                        "status",
                        allowedStatuses
                    )
                    .select()
                    .single();


            if (
                updateError
            ) {

                console.error(
                    "Recovery rejection update error:",
                    updateError
                );

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Unable to reject recovery request."

                    });

            }


            console.log(
                `🛡️ Recovery REJECTED: ${requestId} | IP remains blocked: ${request.ip_address}`
            );


            return res.json({

                success:
                    true,

                message:
                    "Recovery request rejected. IP remains blocked.",

                request:
                    updatedRequest,

                ip:
                    request.ip_address

            });

        } catch (
            error
        ) {

            console.error(
                "Admin recovery rejection error:",
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