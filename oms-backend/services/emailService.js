const transporter = require("../config/nodemailer");

const sendOrderConfirmation = async (order) => {
  const itemsList = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #f1f1f1;">
          <p style="font-size: 16px; font-weight: bold; margin: 0; color: #000;">${i.product.name}</p>
          <p style="font-size: 14px; margin: 8px 0 0 0; color: #666;">Quantity: x${i.quantity}</p>
        </td>
        <td style="padding: 20px 0; border-bottom: 1px solid #f1f1f1; text-align: right;">
          <p style="font-size: 16px; margin: 0; color: #000;">₹${i.priceAtPurchase}</p>
        </td>
      </tr>
      `
    )
    .join("");

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.user.email,
    subject: `Order Confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <!-- Logo Header -->
        <div style="text-align: center; padding: 40px 0;">
          <h1 style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -1px;">nitec<span style="color: #2563eb;">.</span></h1>
        </div>

        <!-- Main Body -->
        <div style="padding: 0 30px;">
          <h2 style="font-size: 24px; font-weight: 400; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            Order Overview
          </h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="padding: 15px 0;">
                <p style="font-size: 18px; font-weight: bold; margin: 0;">Total Amount</p>
              </td>
              <td style="padding: 15px 0; text-align: right;">
                <p style="font-size: 20px; font-weight: bold; margin: 0; color: #2563eb;">₹${order.totalAmount}</p>
              </td>
            </tr>
          </table>

          <h2 style="font-size: 24px; font-weight: 400; margin-top: 50px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            Receiving Information
          </h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1; width: 40%;">
                <p style="font-size: 16px; margin: 0; color: #000;">Customer</p>
              </td>
              <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1; text-align: right;">
                <p style="font-size: 16px; margin: 0; color: #444;">${order.user.name}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1;">
                <p style="font-size: 16px; margin: 0; color: #000;">Email Details</p>
              </td>
              <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1; text-align: right;">
                <p style="font-size: 16px; margin: 0; color: #444;">${order.user.email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1;">
                <p style="font-size: 16px; margin: 0; color: #000;">Payment</p>
              </td>
              <td style="padding: 15px 0; border-bottom: 1px solid #f1f1f1; text-align: right;">
                <p style="font-size: 16px; margin: 0; color: #444;">${order.stripePaymentId ? "Stripe" : "Cash on Delivery"}</p>
              </td>
            </tr>
          </table>

          <p style="font-size: 16px; margin-top: 40px; margin-bottom: 60px; line-height: 1.5; color: #000;">
            Download your official invoice automatically on the 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" style="color: #2563eb; text-decoration: none;">'Orders' page</a>.
          </p>
        </div>
      </div>
    `,
  });
};

const sendStatusUpdate = async (order) => {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const dateStr = new Date(order.updatedAt).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });

  let messageHeading = "";
  let messageBody = "";

  if (order.status === "CONFIRMED") {
    messageHeading = "Payment Verified";
    messageBody = "Are you excited to have the best hardware delivered at your doorstep? Your order is confirmed and is currently being wrapped by our warehouse team.";
  } else if (order.status === "SHIPPED") {
    messageHeading = "Order Dispatched";
    messageBody = "Are you excited to have the best hardware delivered at your doorstep? Your order is wrapped and is legally on its way to you right now.";
  } else if (order.status === "DELIVERED") {
    messageHeading = "Order Delivered";
    messageBody = "Your order has been officially delivered. Please ensure the package is completely sealed. Thank you for shopping with nitec.";
  } else {
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.user.email,
    subject: `nitec Shipment for Order #${shortId}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <!-- Logo Header -->
        <div style="text-align: center; padding: 40px 0;">
          <h1 style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -1px;">nitec<span style="color: #2563eb;">.</span></h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 40px; text-align: center; border-radius: 8px;">
          <!-- Giant visual text alternative for icon -->
          <h2 style="font-size: 28px; margin: 0; color: #2563eb;">${messageHeading}</h2>
        </div>

        <div style="padding: 40px 30px;">
          <p style="font-size: 18px; margin-bottom: 24px; color: #000;">Hello ${order.user.name},</p>
          
          <p style="font-size: 18px; line-height: 1.5; margin-bottom: 24px; color: #000;">
            ${messageBody}
          </p>

          <p style="font-size: 18px; line-height: 1.5; margin-bottom: 40px; color: #000;">
            You can also check the live status of your order by 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" style="color: #2563eb; text-decoration: none;">logging into your account</a>.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
            <tr>
              <td style="padding: 10px 0; width: 40%;">
                <p style="font-size: 15px; margin: 0; color: #444;">Order Number</p>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <p style="font-size: 15px; margin: 0; color: #000;">#${shortId}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <p style="font-size: 15px; margin: 0; color: #444;">Status Date</p>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <p style="font-size: 15px; margin: 0; color: #000;">${dateStr}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <p style="font-size: 15px; margin: 0; color: #444;">Status</p>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <p style="font-size: 15px; margin: 0; font-weight: bold; color: #2563eb;">${order.status}</p>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `,
  });
};

module.exports = { sendOrderConfirmation, sendStatusUpdate };
