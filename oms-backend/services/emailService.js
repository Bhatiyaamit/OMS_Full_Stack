const transporter = require("../config/nodemailer");

const sendOrderConfirmation = async (order) => {
  const itemsList = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${i.product.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${i.priceAtPurchase}</td>
        </tr>`,
    )
    .join("");

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.user.email,
    subject: `Order Confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Hi ${order.user.name}, your order is placed!</h2>
      <p>Order ID: <strong>#${order.id.slice(0, 8).toUpperCase()}</strong></p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #333">Product</th>
            <th style="padding:8px;text-align:center;border-bottom:2px solid #333">Qty</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #333">Price</th>
          </tr>
        </thead>
        <tbody>${itemsList}</tbody>
      </table>
      <p style="margin-top:16px"><strong>Total: ₹${order.totalAmount}</strong></p>
      <p>Status: <strong>${order.status}</strong></p>
    `,
  });
};

const sendStatusUpdate = async (order) => {
  const messages = {
    CONFIRMED: "Your payment is confirmed and your order is being processed.",
    SHIPPED: "Great news — your order is on its way!",
    DELIVERED: "Your order has been delivered. Thank you for shopping with us!",
  };

  const message = messages[order.status];
  if (!message) return; // No email for PENDING

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.user.email,
    subject: `Order Update — ${order.status} (#${order.id.slice(0, 8).toUpperCase()})`,
    html: `
      <h2>Hi ${order.user.name},</h2>
      <p>${message}</p>
      <p>Order ID: <strong>#${order.id.slice(0, 8).toUpperCase()}</strong></p>
      <p>Current Status: <strong>${order.status}</strong></p>
    `,
  });
};

module.exports = { sendOrderConfirmation, sendStatusUpdate };
