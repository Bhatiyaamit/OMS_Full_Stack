import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register custom fonts (using standard PDF fonts is safer without an internet connection,
// but we'll use Helvetica as it is built-in and looks very clean).
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "column",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    letterSpacing: -1,
  },
  logoDot: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6", // Tailwind blue-500
  },
  companySubtext: {
    fontSize: 10,
    color: "#6b7280", // gray-500
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#f3f4f6", // very light gray like image
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: "#6b7280",
    width: 60,
    textAlign: "right",
    marginRight: 8,
  },
  metaValue: {
    fontSize: 9,
    color: "#111827",
    width: 70,
    textAlign: "right",
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#fef3c7", // amber-50
  },
  statusText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#b45309", // amber-700
  },
  statusPillDelivered: {
    backgroundColor: "#d1fae5", // emerald-50
  },
  statusTextDelivered: {
    color: "#047857", // emerald-700
  },
  dividerDark: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#111827",
    marginTop: 20,
    marginBottom: 20,
  },
  addressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addressBox: {
    width: "45%",
  },
  addressHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#9ca3af", // gray-400
    marginBottom: 6,
    letterSpacing: 1,
  },
  nameText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 3,
    lineHeight: 1.3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb", // gray-50
    padding: 8,
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  col1: { width: "8%" },
  col2: { width: "42%" },
  col3: { width: "15%", textAlign: "center" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "20%", textAlign: "right" },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#4b5563", // gray-600
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    alignItems: "center",
  },
  idxText: {
    fontSize: 10,
    color: "#9ca3af",
  },
  itemName: {
    fontSize: 10,
    color: "#111827",
  },
  itemSub: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 2,
  },
  tableCellText: {
    fontSize: 10,
    color: "#111827",
  },
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  summaryBox: {
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#4b5563",
  },
  summaryValue: {
    fontSize: 10,
    color: "#111827",
  },
  freeText: {
    color: "#16a34a", // green-600
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: "#111827",
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  totalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6", // blue-500
  },
  paymentBox: {
    flexDirection: "row",
    marginTop: 30,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
  },
  paymentCol: {
    width: "33%",
  },
  paymentLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 9,
    color: "#6b7280",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
    lineHeight: 1.4,
    width: "60%",
  },
  signatureBox: {
    alignItems: "flex-end",
  },
  signatureFor: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 30,
  },
  signatureAuth: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  currencyPrefix: {
    fontFamily: "Helvetica",
  },
});

const InvoicePDF = ({ order, profile }) => {
  const isDelivered = order.status === "DELIVERED";
  const dateFormatted = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format total using INR symbol or simple Rs.
  // Standard Helvetica might not have the ₹ symbol consistently encoded.
  // We can use generic "Rs." or just the number to be perfectly safe,
  // but let's try ₹. If it drops, we use INR.
  const formatMoney = (val) => `Rs. ${parseFloat(val).toLocaleString("en-IN")}`;

  const customerName = order.user?.name || profile?.name || "Guest User";
  const addressLine1 = profile?.address || "Address not provided";
  const addressLine2 = `${profile?.city || ""}, ${profile?.state || ""}`;
  const addressPin = `PIN: ${profile?.pincode || "N/A"}`;
  const phone = profile?.phone ? `+91 ${profile.phone}` : "";

  const orderSubtotal =
    order.items?.reduce(
      (sum, item) =>
        sum +
        parseFloat(item.product?.price || item.priceAtPurchase) * item.quantity,
      0,
    ) || 0;
  const purchasesTotal =
    order.items?.reduce(
      (sum, item) => sum + parseFloat(item.priceAtPurchase) * item.quantity,
      0,
    ) || 0;
  const itemDiscount = orderSubtotal - purchasesTotal;
  const couponDiscount = parseFloat(order.discountAmount || 0);
  const totalSavings = itemDiscount + couponDiscount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>nitec</Text>
              <Text style={styles.logoDot}>.</Text>
            </View>
            <Text style={styles.companySubtext}>
              nitec.store • support@nitec.store
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>Order Invoice</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaValue}>
                #{order.id.split("-")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{dateFormatted}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status:</Text>
              <View
                style={[
                  styles.statusPill,
                  isDelivered ? styles.statusPillDelivered : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isDelivered ? styles.statusTextDelivered : null,
                  ]}
                >
                  {order.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Thick Divider */}
        <View style={styles.dividerDark} />

        {/* Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.addressHeader}>BILLED TO</Text>
            <Text style={styles.nameText}>{customerName}</Text>
            <Text style={styles.addressLine}>{addressLine1}</Text>
            <Text style={styles.addressLine}>{addressLine2}</Text>
            <Text style={styles.addressLine}>{addressPin}</Text>
            {phone && <Text style={styles.addressLine}>{phone}</Text>}
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressHeader}>SHIPPED TO</Text>
            <Text style={styles.nameText}>{customerName}</Text>
            <Text style={styles.addressLine}>{addressLine1}</Text>
            <Text style={styles.addressLine}>{addressLine2}</Text>
            <Text style={styles.addressLine}>{addressPin}</Text>
            {phone && <Text style={styles.addressLine}>{phone}</Text>}
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.col1]}>#</Text>
          <Text style={[styles.tableHeaderText, styles.col2]}>ITEM</Text>
          <Text style={[styles.tableHeaderText, styles.col3]}>QTY</Text>
          <Text style={[styles.tableHeaderText, styles.col4]}>UNIT PRICE</Text>
          <Text style={[styles.tableHeaderText, styles.col5]}>AMOUNT</Text>
        </View>

        {/* Table Rows */}
        {order.items?.map((item, idx) => {
          const basePrice = parseFloat(
            item.product?.price || item.priceAtPurchase,
          );
          return (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.idxText, styles.col1]}>{idx + 1}</Text>
              <View style={styles.col2}>
                <Text style={styles.itemName}>
                  {item.product?.name || "Unknown Item"}
                </Text>
                <Text style={styles.itemSub}>Order item</Text>
              </View>
              <Text style={[styles.tableCellText, styles.col3]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCellText, styles.col4]}>
                {formatMoney(basePrice)}
              </Text>
              <Text style={[styles.tableCellText, styles.col5]}>
                {formatMoney(item.quantity * basePrice)}
              </Text>
            </View>
          );
        })}

        {/* Summary Block */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(orderSubtotal)}
              </Text>
            </View>

            {totalSavings > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Savings</Text>
                  <Text style={[styles.summaryValue, styles.freeText]}>
                    -{formatMoney(totalSavings)}
                  </Text>
                </View>
                {itemDiscount > 0 && (
                  <View style={{ ...styles.summaryRow, marginBottom: 2 }}>
                    <Text
                      style={{
                        ...styles.summaryLabel,
                        fontSize: 8,
                        paddingLeft: 8,
                        color: "#9ca3af",
                      }}
                    >
                      -- Item Discount
                    </Text>
                    <Text
                      style={{
                        ...styles.summaryValue,
                        fontSize: 8,
                        color: "#16a34a",
                      }}
                    >
                      -{formatMoney(itemDiscount)}
                    </Text>
                  </View>
                )}
                {couponDiscount > 0 && (
                  <View style={{ ...styles.summaryRow, marginBottom: 4 }}>
                    <Text
                      style={{
                        ...styles.summaryLabel,
                        fontSize: 8,
                        paddingLeft: 8,
                        color: "#9ca3af",
                      }}
                    >
                      -- Coupon ({order.couponCode || "Promo"})
                    </Text>
                    <Text
                      style={{
                        ...styles.summaryValue,
                        fontSize: 8,
                        color: "#16a34a",
                      }}
                    >
                      -{formatMoney(couponDiscount)}
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={[styles.summaryValue, styles.freeText]}>Free</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>Included</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatMoney(order.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentBox}>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Payment Mode</Text>
            <Text style={styles.paymentValue}>
              {order.stripePaymentId ? "Online (Stripe)" : "Cash on Delivery"}
            </Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Transaction ID</Text>
            <Text style={styles.paymentValue}>
              {order.stripePaymentId ? order.stripePaymentId : "—"}
            </Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Date</Text>
            <Text style={styles.paymentValue}>{dateFormatted}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated invoice and does not require a physical
            signature.{"\n"}
            For support: support@nitec.store
          </Text>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureFor}>For nitec.</Text>
            <Text style={styles.signatureAuth}>Authorized Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
