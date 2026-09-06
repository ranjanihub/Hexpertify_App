interface BookingConfirmationToCustomerProps {
  customerName: string;
  consultantName: string;
  consultantImage?: string;
  profession: string;
  experience: number;
  planName: string;
  price: string | number;
  status?: "Booked" | "Confirmed";
}

export function BookingConfirmationToCustomerHtml({
  customerName,
  consultantName,
  consultantImage,
  profession,
  experience,
  planName,
  price,
  status = "Booked",
}: BookingConfirmationToCustomerProps): string {
  const bookedDotColor = "#32c95a";
  const confirmedDotColor = status === "Confirmed" ? "#32c95a" : "#444444";
  const completedDotColor = "#444444";
  const consultantPhotoUrl =
    consultantImage ||
    "https://cdn-icons-png.flaticon.com/512/4140/4140048.png";

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation - Hexpertify</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif; color: #ffffff;">
    <div style="width: 100%; background-color: #000000;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000;">
            <tr>
                <td align="center" style="padding: 24px 0;">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #000000;">
                        <!-- HEADER -->
                        <tr>
                            <td style="background-color: #532bce; padding: 16px 24px;">
                                <img src="https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1" alt="Hexpertify Logo" style="height: 40px; display: block;">
                            </td>
                        </tr>

                        <!-- GREETING + ROCKET -->
                        <tr>
                            <td style="padding: 20px 24px 12px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td width="60%" style="vertical-align: top; padding-right: 12px;">
                                            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff;">Woohoo!</h1>
                                            <p style="color: #dddddd; font-size: 14px; margin-top: 8px; line-height: 1.6;">
                                                Dear <strong>${customerName}</strong>,<br><br>
                                                Thank you for booking your consultation with Hexpertify.<br>
                                                Our team will contact you with the available slots shortly.
                                            </p>
                                        </td>
                                        <td width="40%" style="vertical-align: top; text-align: right;">
                                            <img src="https://drive.google.com/uc?export=view&id=1_4-Ndgk5ACPMwkN0naNdTbsJ9iRSkT01" alt="Illustration" style="width: 128px;">
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- CONSULTANT DETAILS -->
                        <tr>
                            <td style="padding: 8px 24px 0 24px; font-size: 18px; font-weight: bold; color: #ffffff;">
                                Consultant details
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 24px;">
                                <table cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="vertical-align: top;">
                                            <img src="${consultantPhotoUrl}" alt="${consultantName}" style="width: 100px; height: 100px; border-radius: 6px; border: 1px solid #D0BCFF; object-fit: cover;">
                                        </td>
                                        <td style="vertical-align: top; padding-left: 20px; font-size: 14px; color: #ffffff; line-height: 1.6;">
                                            <strong>${consultantName}</strong><br>
                                            ${profession}<br>
                                            Experience: ${experience} years<br>
                                            Plan: ${planName}<br>
                                            Price: ${price}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- STATUS BOX -->
                        <tr>
                            <td style="padding: 20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #101010; border: 1px solid #D0BCFF; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 16px; font-size: 14px; color: #ffffff;">
                                            <strong>Appointment Status:</strong>
                                            <span style="color: #A687EF;">${status}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 0 16px 8px 16px;">
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center; font-size: 12px; color: #AAAAAA;">
                                                <tr>
                                                    <td width="33%" style="padding: 0 5px;">
                                                        <span style="display: block; width: 16px; height: 16px; margin: 0 auto; border-radius: 50%; background-color: ${bookedDotColor};"></span>
                                                        <span style="display: block; margin-top: 4px;">Booked</span>
                                                    </td>
                                                    <td width="34%" style="padding: 0 5px;">
                                                        <span style="display: block; width: 16px; height: 16px; margin: 0 auto; border-radius: 50%; background-color: ${confirmedDotColor};"></span>
                                                        <span style="display: block; margin-top: 4px;">Confirmed</span>
                                                    </td>
                                                    <td width="33%" style="padding: 0 5px;">
                                                        <span style="display: block; width: 16px; height: 16px; margin: 0 auto; border-radius: 50%; background-color: ${completedDotColor};"></span>
                                                        <span style="display: block; margin-top: 4px;">Completed</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 16px; font-size: 13px; color: #CCCCCC; line-height: 1.5; text-align: center;">
                                            Your session with <strong>${consultantName}</strong> has been booked.
                                            <br><br>
                                            <a href="https://hexpertify.com" style="display: inline-block; background-color: #532bce; color: #ffffff; padding: 8px 24px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none;">
                                                View Appointment
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- FEEDBACK SECTION -->
                        <tr>
                            <td style="padding: 8px 24px 0 24px; font-size: 14px; color: #ffffff;">
                                We would love to get your feedback.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 24px 8px 24px; font-size: 12px; color: #DDDDDD;">
                                How likely are you to recommend Hexpertify?
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 24px 16px 24px;">
                                <table cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td><a href="#" style="display: block; width: 40px; padding: 8px 0; background-color: #ff4d4f; color: #ffffff; text-align: center; text-decoration: none; border-radius: 4px 0 0 4px;">1</a></td>
                                        <td><a href="#" style="display: block; width: 40px; padding: 8px 0; background-color: #ff964f; color: #ffffff; text-align: center; text-decoration: none;">2</a></td>
                                        <td><a href="#" style="display: block; width: 40px; padding: 8px 0; background-color: #ffcd4f; color: #000000; text-align: center; text-decoration: none;">3</a></td>
                                        <td><a href="#" style="display: block; width: 40px; padding: 8px 0; background-color: #6bd66b; color: #ffffff; text-align: center; text-decoration: none;">4</a></td>
                                        <td><a href="#" style="display: block; width: 40px; padding: 8px 0; background-color: #32c95a; color: #ffffff; text-align: center; text-decoration: none; border-radius: 0 4px 4px 0;">5</a></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- CTA BOX -->
                        <tr>
                            <td style="padding: 32px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #532bce; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 12px 16px; color: #ffffff; font-weight: bold; font-size: 16px;">
                                            Need Immediate Assistance?
                                        </td>
                                        <td style="padding: 12px 16px; text-align: right;">
                                            <a href="mailto:hexpertifyapp@gmail.com" style="display: inline-block; background-color: #D0BCFF; color: #000000; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: bold; text-decoration: none;">
                                                Contact Us
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- FOOTER LOGO -->
                        <tr>
                            <td style="text-align: center; padding: 32px 0;">
                                <img src="https://drive.google.com/uc?export=view&id=1JbSwGHYAyW7F3kfrke7hR-NyzECLr2fq" alt="Hexpertify Logo" style="width: 112px; opacity: 0.95;">
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- FOOTER -->
        <div style="text-align: center; font-size: 11px; color: #CCCCCC; padding-bottom: 8px;">
            You are receiving this email because you booked a consultation with Hexpertify.
            <br>
            Contact us at
            <a href="mailto:hexpertifyapp@gmail.com" style="color: #D0BCFF; text-decoration: underline;">hexpertifyapp@gmail.com</a>
        </div>

        <!-- SOCIAL ICONS -->
        <div style="text-align: center; padding: 8px 0;">
            <a href="https://www.instagram.com/hexpertify?igsh=MXI3ZjN2cnd2amx4dg==" style="margin: 0 8px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="22" alt="Instagram">
            </a>
            <a href="https://www.linkedin.com/company/hexpertify/" style="margin: 0 8px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/145/145807.png" width="22" alt="LinkedIn">
            </a>
            <a href="https://youtube.com/@hexpertify_app?si=SmbHoQzotAuKFIJN" style="margin: 0 8px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="22" alt="YouTube">
            </a>
        </div>

        <!-- LEGAL -->
        <div style="text-align: center; font-size: 11px; color: #999999; padding: 16px 0;">
            <a href="https://hexpertify.com/terms" style="color: #D0BCFF; text-decoration: underline;">Terms & Condition</a>
            |
            <a href="https://hexpertify.com/privacy" style="color: #D0BCFF; text-decoration: underline;">Privacy Policy</a>
            <br><br>
            © 2025 Hexpertify. All Rights Reserved.
        </div>
    </div>
</body>
</html>
    `.trim();
}
