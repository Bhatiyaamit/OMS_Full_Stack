import useCartStore from "../store/cartStore";
import { usePlaceOrder } from "../hooks/useOrders";
import { useNavigate } from "react-router-dom";
import { notification, Modal, Spin } from "antd";

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const { mutate: placeOrder, isPending } = usePlaceOrder();
  const navigate = useNavigate();

  const total = getTotal();

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    Modal.confirm({
      title: "Place Order",
      content: `Confirm order of ${items.length} item(s) for ₹${total.toLocaleString()}?`,
      okText: "Place Order",
      cancelText: "Cancel",
      onOk: () => {
        const orderPayload = {
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        };
        placeOrder(orderPayload, {
          onSuccess: (res) => {
            clearCart();
            notification.success({ message: "Order placed successfully!" });
            navigate(`/order-success/${res.data.id}`);
          },
          onError: (err) => {
            notification.error({
              message: "Order failed",
              description: err?.message || "Please try again",
            });
          },
        });
      },
    });
  };

  return (
    <div className="pb-24 space-y-12">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-surface-container pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">Shopping Cart</h1>
          <p className="text-sm font-bold text-outline uppercase tracking-[0.2em]">{items.length} items</p>
        </div>
      </header>

      {items.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-16 rounded-[2rem] ghost-border shadow-soft flex flex-col items-center justify-center text-center mt-8">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-6 opacity-50">shopping_cart</span>
          <h3 className="text-2xl font-black tracking-tight text-on-surface mb-2">Your cart is empty</h3>
          <p className="text-on-surface-variant font-medium mb-8 max-w-sm">Browse our limited drop collection to find premium pieces you'll love.</p>
          <button 
            onClick={() => navigate("/products")}
            className="gradient-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            Browse Products
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      ) : (
        /* Cart Content */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-6">
            {items.map((item) => (
              <div 
                key={item.product.id} 
                className="glass-panel p-6 rounded-[2rem] ghost-border flex flex-col sm:flex-row items-center gap-6 shadow-soft group hover:shadow-soft-hover transition-all"
              >
                {/* Product Image */}
                <div className="w-32 h-32 rounded-xl bg-surface-container-low flex-shrink-0 overflow-hidden relative border border-surface-container shadow-sm">
                  {getImageUrl(item.product.image) ? (
                    <img 
                      src={getImageUrl(item.product.image)} 
                      alt={item.product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline-variant">image</span>
                    </div>
                  )}
                </div>

                {/* Product Detail */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h3 className="text-xl font-bold tracking-tight text-on-surface mb-1 group-hover:text-primary transition-colors">
                    {item.product.name}
                  </h3>
                  <p className="text-sm font-medium text-outline">
                    ₹{parseFloat(item.product.price).toLocaleString()}
                  </p>
                  <p className="text-xs font-mono text-outline-variant uppercase tracking-widest mt-2">{item.product.id.slice(0, 8)}</p>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center sm:items-end gap-4 flex-shrink-0">
                  <h4 className="text-2xl font-black text-primary">
                    ₹{(parseFloat(item.product.price) * item.quantity).toLocaleString()}
                  </h4>
                  <div className="flex items-center gap-4 bg-surface-container-low p-1.5 rounded-full shadow-inner">
                    <button 
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-on-surface font-black hover:bg-surface-container-highest transition-colors active:scale-90"
                      onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <button 
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-on-surface font-black hover:bg-surface-container-highest transition-colors active:scale-90"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.product.id)}
                    className="text-[10px] font-bold tracking-widest uppercase text-error hover:text-error-dim flex items-center gap-1 transition-colors mt-2"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary Block */}
          <div className="lg:col-span-4 h-fit">
            <div className="bg-inverse-surface rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
              {/* Background accent */}
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/40 transition-all duration-700"></div>
              
              <h2 className="text-xl font-bold tracking-tight text-white mb-8 relative z-10">Order Summary</h2>
              
              <div className="space-y-4 text-inverse-on-surface font-medium relative z-10">
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-80">Subtotal</span>
                  <span className="font-bold">₹{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-80">Shipping & Handling</span>
                  <span className="font-bold text-secondary-container">Free Delivery</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-80">Taxes</span>
                  <span className="font-bold">Calculated at checkout</span>
                </div>
                
                <div className="w-full h-px bg-white/10 my-6"></div>
                
                <div className="flex justify-between items-end mb-8 pt-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#a8b8c8] opacity-80">Total</span>
                  <span className="text-4xl font-extrabold text-white tracking-tighter">₹{total.toLocaleString()}</span>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="w-full gradient-primary text-on-primary py-5 rounded-full font-bold text-base shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                  {isPending ? <Spin size="small" /> : 'Confirm Order'}
                  <span className="material-symbols-outlined font-normal">shopping_bag</span>
                </button>
                
                <div className="pt-6 flex items-center justify-center gap-2 text-xs font-bold text-inverse-on-surface opacity-60">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Secure 256-bit encrypted checkout
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
