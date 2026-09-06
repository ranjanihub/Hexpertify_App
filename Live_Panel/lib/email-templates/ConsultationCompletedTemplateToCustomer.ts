interface ConsultationCompletedProps {
  customerName?: string;
  consultantName?: string;
  consultantImage?: string;
  appointmentUrl?: string;
}

export function ConsultationCompletedToCustomerHtml({
  customerName = "Customer",
  consultantName = "Consultant",
  consultantImage,
  appointmentUrl = "https://hexpertify.com",
}: ConsultationCompletedProps): string {
  const avatarUrl =
    "https://drive.google.com/uc?export=view&id=13QK_5oWM4A_7j5moQ9q7oO1aizQvlTkm";
  const feedbackUrl = "https://forms.gle/ZDS4UvVeSj7eyoZR8";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Consultation Completed - Hexpertify</title>
    <style>
        /* Keep desktop layout for mobile as well */
        @media only screen and (max-width: 480px) {
            .container {
                max-width: 600px !important;
                width: 100% !important;
            }

            table, td {
                vertical-align: middle !important;
            }
        }
    </style>
</head>

<body style="margin:0;padding:0;background-color:#000000;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;">
<tr>
<td align="center">

<table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#000000;">

<!-- Header -->
<tr>
<td style="padding:16px 20px;background-color:#532bce;">
<img src="https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1" alt="Hexpertify Logo" style="height:35px;display:block;border:0;">
</td>
</tr>

<!-- Hero -->
<tr>
<td style="padding:40px 25px 10px 25px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="vertical-align:middle;">
<h1 style="margin:0;font-size:36px;font-weight:bold;color:#ffffff;">Woohoo!</h1>
<p style="margin:15px 0 0 0;font-size:16px;">Dear <strong>${customerName}</strong>,</p>
<p style="margin:10px 0 0 0;font-size:15px;line-height:1.5;">
Your consultation has been successfully completed.
</p>
<p style="margin:20px 0 0 0;font-size:15px;line-height:1.5;">
<strong>Thank you</strong> for Trusting Us, please feel free to share any feedback or suggestions you may have.
</p>
</td>

<td style="vertical-align:middle;text-align:right;width:150px;">
<img src="${avatarUrl}" alt="Avatar" style="width:130px;height:auto;display:inline-block;">
</td>
</tr>
</table>
</td>
</tr>

<!-- Status Card -->
<tr>
<td style="padding:20px 25px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;border-radius:12px;border:1px solid #333;">
<tr>
<td style="padding:20px 20px 10px;font-size:16px;">
<strong>Appointment Status:</strong>
<span style="color:#32c95a;font-weight:bold;"> Completed</span>
</td>
</tr>

<tr>
<td style="padding:15px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" width="33%">
<div style="width:14px;height:14px;background:#444;border-radius:50%;margin-bottom:8px;"></div>
<div style="font-size:12px;color:#aaa;">Booked</div>
</td>
<td align="center" width="34%">
<div style="width:14px;height:14px;background:#444;border-radius:50%;margin-bottom:8px;"></div>
<div style="font-size:12px;color:#aaa;">Confirmed</div>
</td>
<td align="center" width="33%">
<div style="width:14px;height:14px;background:#32c95a;border-radius:50%;margin-bottom:8px;box-shadow:0 0 10px rgba(50,201,90,.4);"></div>
<div style="font-size:12px;font-weight:bold;">Completed</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td align="center" style="padding:15px 20px 25px;">
<p style="margin:0 0 20px;font-size:14px;color:#ccc;">
Your session with <strong>${consultantName}</strong> has now been completed.
</p>
<a href="${appointmentUrl}" style="display:inline-block;padding:12px 30px;background:#532bce;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">
View Appointment
</a>
</td>
</tr>
</table>
</td>
</tr>

<!-- Feedback -->
<tr>
<td style="padding:10px 25px;">
<p style="margin:0 0 10px;font-size:14px;">We'd love your feedback!</p>
<table cellpadding="0" cellspacing="0" border="0">
<tr>
<td><a href="${feedbackUrl}" style="display:block;width:40px;padding:10px 0;text-align:center;background:#ff4d4f;color:#fff;text-decoration:none;">1</a></td>
<td><a href="${feedbackUrl}" style="display:block;width:40px;padding:10px 0;text-align:center;background:#ff964f;color:#fff;text-decoration:none;">2</a></td>
<td><a href="${feedbackUrl}" style="display:block;width:40px;padding:10px 0;text-align:center;background:#ffcd4f;color:#000;text-decoration:none;">3</a></td>
<td><a href="${feedbackUrl}" style="display:block;width:40px;padding:10px 0;text-align:center;background:#6bd66b;color:#fff;text-decoration:none;">4</a></td>
<td><a href="${feedbackUrl}" style="display:block;width:40px;padding:10px 0;text-align:center;background:#32c95a;color:#fff;text-decoration:none;">5</a></td>
</tr>
</table>
<p style="margin:8px 0 0;font-size:10px;color:#888;">Click any rating to share your feedback.</p>
</td>
</tr>

<!-- CTA -->
<tr>
<td style="padding:25px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#532bce;border-radius:12px;">
<tr>
<td style="padding:20px;font-size:14px;">
<strong>Book your next session in minutes.</strong><br>
<span style="opacity:.9;">Find certified experts for every category.</span>
</td>
<td style="padding:20px;text-align:right;">
<a href="https://hexpertify.com"
   style="
     display:inline-block;
     background-color:#ffffff;
     color:#532bce;
     padding:12px 28px;
     border-radius:25px;
     text-decoration:none;
     font-size:13px;
     font-weight:700;
     line-height:1;
     white-space:nowrap;
     text-align:center;
     -webkit-text-size-adjust:none;
   ">
   Book Now
</a>

</td>
</tr>
</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td align="center" style="padding:20px 0 40px;">
<img src="https://drive.google.com/uc?export=view&id=1JbSwGHYAyW7F3kfrke7hR-NyzECLr2fq" alt="Hexpertify" style="width:120px;opacity:.8;">
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
`.trim();
}
