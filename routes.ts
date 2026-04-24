import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import {
  getUserByEmail,
  getUserById,
  createUser,
  createSession,
  getSession,
  deleteSession,
  hashPassword,
  setUserRole,
  updateUserPassword,
  getCategories,
  getProducts,
  getProductById,
  getProductByIdRaw,
  createProduct,
  createAdminProduct,
  updateProduct,
  deleteProduct,
  deleteOrder,
  deleteUser,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getVendorProfile,
  createVendorProfile,
  updateVendorProfile,
  getAllVendors,
  getFeeRecords,
  createFeeRecord,
  updateFeeRecord,
  getAnalytics,
  createNotification,
  getNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getDeliveryCharge,
  setDeliveryCharge,
} from "./storage";

const ADMIN_EMAIL = "laknyemchungz67@gmail.com";

function getSessionId(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function requireAuth(req: Request, res: Response): Promise<{ user_id: number; name: string; email: string; role: string } | null> {
  const sid = getSessionId(req);
  if (!sid) { res.status(401).json({ message: "Unauthorized" }); return null; }
  const session = await getSession(sid);
  if (!session) { res.status(401).json({ message: "Session expired" }); return null; }
  return session;
}

async function requireRole(req: Request, res: Response, ...roles: string[]): Promise<{ user_id: number; name: string; email: string; role: string } | null> {
  const session = await requireAuth(req, res);
  if (!session) return null;
  if (!roles.includes(session.role)) { res.status(403).json({ message: "Forbidden" }); return null; }
  return session;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone, password, role, shopName, productType } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password required" });
      const existing = await getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      // Only the designated admin email gets admin role; all others are customer or vendor
      const normalizedEmail = email.trim().toLowerCase();
      const userRole = normalizedEmail === ADMIN_EMAIL ? "admin" : role === "vendor" ? "vendor" : "customer";
      const user = await createUser(name, normalizedEmail, phone || "", password, userRole);
      if (userRole === "vendor" && shopName) {
        await createVendorProfile({ userId: user.id, shopName, phone: phone || "", productType: productType || "" });
      }
      const token = await createSession(user.id);
      res.json({ user, token });
    } catch (e: unknown) {
      console.error(e);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      let user = await getUserByEmail(email.trim().toLowerCase());
      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      // Ensure the designated admin email always has admin role
      if (user.email === ADMIN_EMAIL && user.role !== "admin") {
        await setUserRole(user.id, "admin");
        user = { ...user, role: "admin" };
      }
      const token = await createSession(user.id);
      const { password: _pw, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (e: unknown) {
      console.error(e);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sid = getSessionId(req);
    if (sid) await deleteSession(sid);
    res.json({ ok: true });
  });

  // Check if email exists (for unified admin-auth flow)
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      const user = await getUserByEmail(email.trim().toLowerCase());
      res.json({ exists: !!user });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Reset password (no token needed – direct reset)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) return res.status(400).json({ message: "Email and new password required" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const user = await getUserByEmail(email.trim().toLowerCase());
      if (!user) return res.status(404).json({ message: "No account found with this email" });
      await updateUserPassword(email.trim().toLowerCase(), newPassword);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed to reset password" }); }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const sid = getSessionId(req);
      if (!sid) return res.status(401).json({ message: "Unauthorized" });
      const session = await getSession(sid);
      if (!session) return res.status(401).json({ message: "Session expired" });
      const user = await getUserById(session.user_id);
      res.json(user);
    } catch (e: unknown) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const cats = await getCategories();
      res.json(cats);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Products (public)
  app.get("/api/products", async (req, res) => {
    try {
      const { category_id, search } = req.query;
      const products = await getProducts({
        categoryId: category_id ? parseInt(category_id as string) : undefined,
        search: search as string | undefined,
        approvedOnly: true,
      });
      res.json(products);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await getProductById(parseInt(req.params.id));
      if (!product) return res.status(404).json({ message: "Not found" });
      res.json(product);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      const notifications = await getNotifications(session.user_id);
      res.json(notifications);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      const count = await countUnreadNotifications(session.user_id);
      res.json({ count });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      await markAllNotificationsRead(session.user_id);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      await markNotificationRead(parseInt(req.params.id), session.user_id);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Orders
  app.post("/api/orders", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      const { items, total, deliveryAddress, deliveryNotes, paymentMethod } = req.body;
      if (!items || !total) return res.status(400).json({ message: "Items and total required" });
      const order = await createOrder({
        userId: session.user_id,
        items,
        total,
        deliveryAddress: deliveryAddress || "",
        deliveryNotes: deliveryNotes || "",
        paymentMethod: paymentMethod || "cod",
      });
      // Notify customer of successful order placement
      createNotification({
        userId: session.user_id,
        message: `Order #${order.id} placed successfully! Total: ₹${total}. We'll confirm it soon.`,
        type: "order",
      }).catch(() => {});
      res.json(order);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      const orders = await getOrders({ userId: session.user_id });
      res.json(orders);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const session = await requireAuth(req, res);
      if (!session) return;
      const order = await getOrderById(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Not found" });
      if (session.role === "customer" && order.user_id !== session.user_id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(order);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Vendor routes
  app.get("/api/vendor/profile", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const profile = await getVendorProfile(session.user_id);
      res.json(profile);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/vendor/profile", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const { shopName, phone, productType } = req.body;
      const profile = await createVendorProfile({
        userId: session.user_id,
        shopName,
        phone,
        productType,
      });
      res.json(profile);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/vendor/products", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const products = await getProducts({ vendorId: session.user_id });
      res.json(products);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/vendor/products", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const { name, description, price, categoryId, stock, unit, imageUrl } = req.body;
      if (!name || !price || !categoryId) {
        return res.status(400).json({ message: "Name, price and category required" });
      }
      const product = await createProduct({
        name,
        description: description || "",
        price: parseFloat(price),
        categoryId: parseInt(categoryId),
        vendorId: session.user_id,
        stock: parseInt(stock) || 0,
        unit: unit || "piece",
        imageUrl: imageUrl || "",
      });
      res.json(product);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/vendor/products/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const pid = parseInt(req.params.id);
      const existing = await getProductByIdRaw(pid);
      if (!existing) return res.status(404).json({ message: "Product not found" });
      if (session.role === "vendor") {
        if (existing.vendor_id !== session.user_id) return res.status(403).json({ message: "Forbidden" });
        if (existing.is_approved) return res.status(403).json({ message: "Cannot edit a live product. Contact admin to make changes." });
      }
      const { name, description, price, categoryId, stock, unit, imageUrl } = req.body;
      const product = await updateProduct(pid, {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        unit,
        imageUrl,
        rejectionReason: null,
      });
      res.json(product);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/vendor/products/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const pid = parseInt(req.params.id);
      const existing = await getProductByIdRaw(pid);
      if (!existing) return res.status(404).json({ message: "Product not found" });
      if (session.role === "vendor") {
        if (existing.vendor_id !== session.user_id) return res.status(403).json({ message: "Forbidden" });
        if (existing.is_approved) return res.status(403).json({ message: "Cannot delete a live product. Contact admin to remove it." });
      }
      await deleteProduct(pid);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/vendor/fees", async (req, res) => {
    try {
      const session = await requireRole(req, res, "vendor", "admin");
      if (!session) return;
      const fees = await getFeeRecords(session.user_id);
      res.json(fees);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Admin routes
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const data = await getAnalytics();
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed" });
    }
  });

  app.get("/api/admin/products", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const products = await getProducts({ includeAll: true });
      res.json(products);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.put("/api/admin/products/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { isApproved, isActive, name, description, price, stock, unit, categoryId, imageUrl, rejectionReason } = req.body;
      const pid = parseInt(req.params.id);
      const existingProduct = await getProductByIdRaw(pid);
      const updateData: Parameters<typeof updateProduct>[1] = {
        isActive,
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        unit,
        categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
        imageUrl,
      };
      if (isApproved !== undefined) {
        updateData.isApproved = isApproved;
        if (isApproved) {
          updateData.rejectionReason = null;
        }
      }
      if (rejectionReason !== undefined) {
        updateData.rejectionReason = rejectionReason || null;
      }
      const product = await updateProduct(pid, updateData);
      // Send notification to vendor
      if (existingProduct) {
        if (isApproved === true) {
          createNotification({
            userId: existingProduct.vendor_id,
            message: `Your product "${existingProduct.name}" has been approved ✅ and is now live on the marketplace!`,
            type: "product",
          }).catch(() => {});
        } else if (isApproved === false || rejectionReason) {
          createNotification({
            userId: existingProduct.vendor_id,
            message: `Your product "${existingProduct.name}" was rejected ❌. Reason: ${rejectionReason || "Not specified"}. Please update and resubmit.`,
            type: "product",
          }).catch(() => {});
        }
      }
      res.json(product);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/admin/products", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { name, description, price, categoryId, stock, unit, imageUrl } = req.body;
      if (!name || !price || !categoryId) {
        return res.status(400).json({ message: "Name, price and category required" });
      }
      const product = await createAdminProduct({
        name,
        description: description || "",
        price: parseFloat(price),
        categoryId: parseInt(categoryId),
        vendorId: session.user_id,
        stock: parseInt(stock) || 0,
        unit: unit || "piece",
        imageUrl: imageUrl || "",
      });
      res.json(product);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      await deleteProduct(parseInt(req.params.id));
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { status } = req.query;
      const orders = await getOrders({ status: status as string | undefined });
      res.json(orders);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.put("/api/admin/orders/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { status, assignedTo } = req.body;
      const oid = parseInt(req.params.id);
      const existingOrder = await getOrderById(oid);
      const order = await updateOrderStatus(oid, status, assignedTo);
      // Notify customer of status change
      if (existingOrder) {
        const messages: Record<string, string> = {
          confirmed: `Order #${oid} has been confirmed! We're preparing your items.`,
          out_for_delivery: `Order #${oid} is out for delivery 🚚${assignedTo ? ` with ${assignedTo}` : ""}! Get ready to receive it.`,
          delivered: `Order #${oid} has been delivered ✅. Thank you for shopping with Northeast Basket!`,
          cancelled: `Order #${oid} has been cancelled. Contact us if you have any questions.`,
        };
        const msg = messages[status];
        if (msg) {
          createNotification({ userId: existingOrder.user_id, message: msg, type: "order" }).catch(() => {});
        }
      }
      res.json(order);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/admin/orders/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      await deleteOrder(parseInt(req.params.id));
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/admin/vendors", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const vendors = await getAllVendors();
      res.json(vendors);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.put("/api/admin/vendors/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { isApproved, slotNumber, registrationPaid } = req.body;
      const profile = await updateVendorProfile(parseInt(req.params.id), {
        isApproved,
        slotNumber: slotNumber !== undefined ? parseInt(slotNumber) : undefined,
        registrationPaid,
      });
      res.json(profile);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/admin/vendors/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      await deleteUser(parseInt(req.params.id));
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // Delivery charge settings (public GET, admin PUT)
  app.get("/api/settings/delivery-charge", async (_req, res) => {
    try {
      const charge = await getDeliveryCharge();
      res.json({ charge });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.put("/api/admin/settings/delivery-charge", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { charge } = req.body;
      if (charge === undefined || isNaN(parseFloat(charge))) {
        return res.status(400).json({ message: "Valid charge amount required" });
      }
      await setDeliveryCharge(parseFloat(charge));
      res.json({ ok: true, charge: parseFloat(charge) });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/admin/fees", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const fees = await getFeeRecords();
      res.json(fees);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/admin/fees", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { vendorId, feeType, amount, feeDate, notes } = req.body;
      const fee = await createFeeRecord({ vendorId, feeType, amount, feeDate, notes: notes || "" });
      res.json(fee);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.put("/api/admin/fees/:id", async (req, res) => {
    try {
      const session = await requireRole(req, res, "admin");
      if (!session) return;
      const { paid } = req.body;
      const fee = await updateFeeRecord(parseInt(req.params.id), paid);
      res.json(fee);
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
