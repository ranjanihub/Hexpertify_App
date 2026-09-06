interface AdminBookingEmailProps {
  booking: {
    serviceName: string;
    consultantName: string;
    status: string;
    date: string;
    userName: string;
    userEmail: string;
    userPhone: string;
  };
}

export function AdminBookingEmailHtml({
  booking,
}: AdminBookingEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Created</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; min-height: 100vh;">
    <div style="padding: 24px;">
        <div style="max-width: 576px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; padding: 24px;">
            <h1 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 16px;">
                New Booking Created
            </h1>

            <p style="color: #374151; margin-bottom: 16px;">
                A new booking has been created for
                <span style="font-weight: 600;">${booking.serviceName}</span> with
                <span style="font-weight: 600;">${booking.consultantName}</span>.
            </p>

            <!-- Booking Info -->
            <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                <p style="color: #111827; font-weight: 600; margin-bottom: 8px;">Booking Details</p>
                <div style="color: #374151;">
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">Service Name:</span> ${booking.serviceName}
                    </p>
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">Consultant:</span> ${booking.consultantName}
                    </p>
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">Status:</span> ${booking.status}
                    </p>
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">Date:</span> ${booking.date}
                    </p>
                </div>
            </div>

            <!-- User Info -->
            <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                <p style="color: #111827; font-weight: 600; margin-bottom: 8px;">User Info</p>
                <div style="color: #374151;">
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">User Name:</span> ${booking.userName}
                    </p>
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">Email:</span>
                        <a href="mailto:${booking.userEmail}" style="color: #2563eb; text-decoration: underline;">
                            ${booking.userEmail}
                        </a>
                    </p>
                    <p style="margin: 4px 0;">
                        <span style="font-weight: 500;">Phone:</span> ${booking.userPhone}
                    </p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}
