interface BookingConfirmationToConsultantProps {
  consultantName: string;
  consultantImage?: string;
  customerName: string;
  planName: string;
  date: string;
}

export function BookingConfirmationToConsultantHtml({
  consultantName,
  consultantImage,
  customerName,
  planName,
  date,
}: BookingConfirmationToConsultantProps): string {
  // Always use boy avatar instead of consultant image
  const avatarUrl =
    "https://drive.google.com/uc?export=view&id=1_4-Ndgk5ACPMwkN0naNdTbsJ9iRSkT01";
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Received - Hexpertify</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif; color: #ffffff;">
    <div style="width: 100%; background-color: #000000;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000;">
            <tr>
                <td align="center" style="padding: 24px 0;">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #000000;">
                        <!-- HEADER -->
                        <tr>
                            <td style="background-color: #532bce; padding: 20px;">
                                <img src="https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1" alt="Hexpertify Logo" style="height: 48px; display: block;">
                            </td>
                        </tr>

                        <!-- TITLE + ROCKET -->
                        <tr>
                            <td style="padding: 36px 20px 8px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td width="60%" style="vertical-align: top;">
                                            <h1 style="margin: 0; font-size: 30px; font-weight: bold; color: #ffffff;">Woohoo!</h1>
                                            <p style="color: #eaeaea; font-size: 14px; line-height: 1.6; margin-top: 12px;">
                                                Dear <strong>${consultantName}</strong>,<br><br>
                                                You have received a new booking on Hexpertify.
                                            </p>
                                            <div style="color: #ffffff; font-size: 14px; margin-top: 20px; line-height: 1.6;">
                                                <b>${customerName}</b><br>
                                                Plan: <b>${planName}</b><br>
                                                Booking Date: <b>${date}</b>
                                            </div>
                                        </td>
                                        <td width="40%" style="vertical-align: top; text-align: right;">
                                            <img src="${avatarUrl}" alt="${consultantName}" style="width: 120px; height: 120px; object-fit: cover;">
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- MESSAGE SECTION -->
                        <tr>
                            <td style="padding: 16px 20px; color: #e6e6e6; font-size: 14px; line-height: 1.6;">
                                To help us schedule the session smoothly, please reply to this email
                                with your available time slots for the next 2–3 days.
                                <br><br>
                                Once we receive your availability, we will confirm the session with
                                the client and share the final schedule with you.
                                <br><br>
                                Thank you for your timely response and support.
                            </td>
                        </tr>

                        <!-- CTA SECTION -->
                        <tr>
                            <td style="padding: 32px 20px; text-align: center;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #532bce; border-radius: 6px;">
                                    <tr>
                                        <td style="padding: 12px 16px; color: #ffffff; font-size: 16px; font-weight: bold;">
                                            Need Immediate Assistance?
                                        </td>
                                        <td style="padding: 12px 16px; text-align: right;">
                                            <a href="mailto:hexpertifyapp@gmail.com" style="display: inline-block; background-color: #D0BCFF; color: #000000; font-weight: bold; font-size: 12px; padding: 8px 16px; border-radius: 4px; text-decoration: none;">
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
        <div style="text-align: center; font-size: 11px; color: #cccccc; padding-bottom: 8px;">
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
