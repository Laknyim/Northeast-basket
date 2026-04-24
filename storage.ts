import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function setUserRole(userId: number, role: string) {
  await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, userId]);
}

export async function getUserByEmail(email: string) {
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  return result.rows[0] || null;
}

export async function getUserById(id: number) {
  const result = await pool.query(
    "SELECT id,name,email,phone,role,created_at FROM users WHERE id=$1",
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(
  name: string,
  email: string,
  phone: string,
  password: string,
  role = "customer"
) {
  const hashed = hashPassword(password);
  const result = await pool.query(
    "INSERT INTO users (name,email,phone,password,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,phone,role,created_at",
    [name, email, phone, hashed, role]
  );
  return result.rows[0];
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  await pool.query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES($1,$2,$3)",
    [sessionId, userId, expiresAt]
  );
  return sessionId;
}

export async function getSession(sessionId: string) {
  const result = await pool.query(
    `SELECT s.user_id, u.name, u.email, u.phone, u.role
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.id=$1 AND s.expires_at > NOW()`,
    [sessionId]
  );
  return result.rows[0] || null;
}

export async function deleteSession(sessionId: string) {
  await pool.query("DELETE FROM sessions WHERE id=$1", [sessionId]);
}

export async function getCategories() {
  const result = await pool.query("SELECT * FROM categories ORDER BY sort_order");
  return result.rows;
}

export async function getProducts(opts: {
  categoryId?: number;
  search?: string;
  vendorId?: number;
  approvedOnly?: boolean;
  includeAll?: boolean;
}) {
  let q = `SELECT p.*, c.name as category_name, u.name as vendor_name
           FROM products p
           JOIN categories c ON c.id=p.category_id
           JOIN users u ON u.id=p.vendor_id
           WHERE 1=1`;
  const params: unknown[] = [];
  let i = 1;

  if (opts.approvedOnly) {
    q += ` AND p.is_approved=true AND p.is_active=true`;
  }
  if (opts.categoryId) {
    q += ` AND p.category_id=$${i++}`;
    params.push(opts.categoryId);
  }
  if (opts.search) {
    q += ` AND (p.name ILIKE $${i} OR p.description ILIKE $${i})`;
    i++;
    params.push(`%${opts.search}%`);
  }
  if (opts.vendorId) {
    q += ` AND p.vendor_id=$${i++}`;
    params.push(opts.vendorId);
  }
  q += " ORDER BY p.created_at DESC";
  const result = await pool.query(q, params);
  return result.rows;
}

export async function getProductById(id: number) {
  const result = await pool.query(
    `SELECT p.*, c.name as category_name, u.name as vendor_name
     FROM products p
     JOIN categories c ON c.id=p.category_id
     JOIN users u ON u.id=p.vendor_id
     WHERE p.id=$1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  vendorId: number;
  stock: number;
  unit: string;
  imageUrl?: string;
}) {
  const result = await pool.query(
    "INSERT INTO products (name,description,price,category_id,vendor_id,stock,unit,image_url,is_approved,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,false,true) RETURNING *",
    [
      data.name,
      data.description,
      data.price,
      data.categoryId,
      data.vendorId,
      data.stock,
      data.unit,
      data.imageUrl || "",
    ]
  );
  return result.rows[0];
}

export async function getProductByIdRaw(id: number) {
  const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
  return result.rows[0] || null;
}

export async function updateProduct(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    price: number;
    categoryId: number;
    stock: number;
    unit: string;
    imageUrl: string;
    isApproved: boolean;
    isActive: boolean;
    rejectionReason: string | null;
  }>
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (data.name !== undefined) {
    sets.push(`name=$${i++}`);
    params.push(data.name);
  }
  if (data.description !== undefined) {
    sets.push(`description=$${i++}`);
    params.push(data.description);
  }
  if (data.price !== undefined) {
    sets.push(`price=$${i++}`);
    params.push(data.price);
  }
  if (data.categoryId !== undefined) {
    sets.push(`category_id=$${i++}`);
    params.push(data.categoryId);
  }
  if (data.stock !== undefined) {
    sets.push(`stock=$${i++}`);
    params.push(data.stock);
  }
  if (data.unit !== undefined) {
    sets.push(`unit=$${i++}`);
    params.push(data.unit);
  }
  if (data.imageUrl !== undefined) {
    sets.push(`image_url=$${i++}`);
    params.push(data.imageUrl);
  }
  if (data.isApproved !== undefined) {
    sets.push(`is_approved=$${i++}`);
    params.push(data.isApproved);
  }
  if (data.isActive !== undefined) {
    sets.push(`is_active=$${i++}`);
    params.push(data.isActive);
  }
  if ("rejectionReason" in data) {
    sets.push(`rejection_reason=$${i++}`);
    params.push(data.rejectionReason ?? null);
  }
  if (sets.length === 0) return null;
  params.push(id);
  const result = await pool.query(
    `UPDATE products SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    params
  );
  return result.rows[0];
}

export async function deleteProduct(id: number) {
  await pool.query("DELETE FROM products WHERE id=$1", [id]);
}

export async function deleteOrder(id: number) {
  await pool.query("DELETE FROM orders WHERE id=$1", [id]);
}

export async function deleteUser(id: number) {
  await pool.query("DELETE FROM users WHERE id=$1", [id]);
}

export async function createAdminProduct(data: {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  vendorId: number;
  stock: number;
  unit: string;
  imageUrl?: string;
}) {
  const result = await pool.query(
    "INSERT INTO products (name,description,price,category_id,vendor_id,stock,unit,image_url,is_approved,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,true) RETURNING *",
    [
      data.name,
      data.description,
      data.price,
      data.categoryId,
      data.vendorId,
      data.stock,
      data.unit,
      data.imageUrl || "",
    ]
  );
  return result.rows[0];
}

export async function getDeliveryCharge(): Promise<number> {
  const result = await pool.query(
    "SELECT value FROM app_settings WHERE key='delivery_charge' LIMIT 1"
  );
  if (result.rows[0]) return parseFloat(result.rows[0].value) || 0;
  return 20;
}

export async function setDeliveryCharge(amount: number) {
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES('delivery_charge', $1)
     ON CONFLICT (key) DO UPDATE SET value=$1`,
    [String(amount)]
  );
}

export async function createOrder(data: {
  userId: number;
  items: unknown[];
  total: number;
  deliveryAddress: string;
  deliveryNotes: string;
  paymentMethod: string;
}) {
  const result = await pool.query(
    "INSERT INTO orders (user_id,items_json,total,delivery_address,delivery_notes,payment_method,status) VALUES($1,$2,$3,$4,$5,$6,'pending') RETURNING *",
    [
      data.userId,
      JSON.stringify(data.items),
      data.total,
      data.deliveryAddress,
      data.deliveryNotes,
      data.paymentMethod,
    ]
  );
  return result.rows[0];
}

export async function getOrders(opts: { userId?: number; status?: string }) {
  let q = `SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone
           FROM orders o JOIN users u ON u.id=o.user_id WHERE 1=1`;
  const params: unknown[] = [];
  let i = 1;
  if (opts.userId) {
    q += ` AND o.user_id=$${i++}`;
    params.push(opts.userId);
  }
  if (opts.status) {
    q += ` AND o.status=$${i++}`;
    params.push(opts.status);
  }
  q += " ORDER BY o.created_at DESC";
  const result = await pool.query(q, params);
  return result.rows.map((r) => ({ ...r, items: JSON.parse(r.items_json) }));
}

export async function getOrderById(id: number) {
  const result = await pool.query(
    `SELECT o.*, u.name as user_name, u.phone as user_phone
     FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1`,
    [id]
  );
  if (!result.rows[0]) return null;
  return { ...result.rows[0], items: JSON.parse(result.rows[0].items_json) };
}

export async function updateOrderStatus(
  id: number,
  status: string,
  assignedTo?: string
) {
  const result = await pool.query(
    "UPDATE orders SET status=$1, assigned_to=$2, updated_at=NOW() WHERE id=$3 RETURNING *",
    [status, assignedTo || null, id]
  );
  return result.rows[0];
}

export async function getVendorProfile(userId: number) {
  const result = await pool.query(
    "SELECT * FROM vendor_profiles WHERE user_id=$1",
    [userId]
  );
  return result.rows[0] || null;
}

export async function createVendorProfile(data: {
  userId: number;
  shopName: string;
  phone: string;
  productType: string;
}) {
  const result = await pool.query(
    "INSERT INTO vendor_profiles (user_id,shop_name,phone,product_type,registration_year) VALUES($1,$2,$3,$4,$5) RETURNING *",
    [
      data.userId,
      data.shopName,
      data.phone,
      data.productType,
      new Date().getFullYear(),
    ]
  );
  return result.rows[0];
}

export async function updateVendorProfile(
  userId: number,
  data: Partial<{
    shopName: string;
    phone: string;
    productType: string;
    slotNumber: number;
    isApproved: boolean;
    registrationPaid: boolean;
  }>
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (data.shopName !== undefined) {
    sets.push(`shop_name=$${i++}`);
    params.push(data.shopName);
  }
  if (data.phone !== undefined) {
    sets.push(`phone=$${i++}`);
    params.push(data.phone);
  }
  if (data.productType !== undefined) {
    sets.push(`product_type=$${i++}`);
    params.push(data.productType);
  }
  if (data.slotNumber !== undefined) {
    sets.push(`slot_number=$${i++}`);
    params.push(data.slotNumber);
  }
  if (data.isApproved !== undefined) {
    sets.push(`is_approved=$${i++}`);
    params.push(data.isApproved);
  }
  if (data.registrationPaid !== undefined) {
    sets.push(`registration_paid=$${i++}`);
    params.push(data.registrationPaid);
  }
  if (sets.length === 0) return null;
  params.push(userId);
  const result = await pool.query(
    `UPDATE vendor_profiles SET ${sets.join(",")} WHERE user_id=$${i} RETURNING *`,
    params
  );
  return result.rows[0];
}

export async function getAllVendors() {
  const result = await pool.query(
    `SELECT u.id,u.name,u.email,u.phone,
            vp.shop_name,vp.product_type,vp.slot_number,
            vp.is_approved,vp.registration_year,vp.registration_paid,vp.created_at
     FROM users u
     LEFT JOIN vendor_profiles vp ON vp.user_id=u.id
     WHERE u.role='vendor'
     ORDER BY u.created_at DESC`
  );
  return result.rows;
}

export async function getFeeRecords(vendorId?: number) {
  let q = `SELECT f.*, u.name as vendor_name, vp.shop_name
           FROM fee_records f
           JOIN users u ON u.id=f.vendor_id
           LEFT JOIN vendor_profiles vp ON vp.user_id=f.vendor_id
           WHERE 1=1`;
  const params: unknown[] = [];
  if (vendorId) {
    q += " AND f.vendor_id=$1";
    params.push(vendorId);
  }
  q += " ORDER BY f.fee_date DESC, f.created_at DESC";
  const result = await pool.query(q, params);
  return result.rows;
}

export async function createFeeRecord(data: {
  vendorId: number;
  feeType: string;
  amount: number;
  feeDate: string;
  notes: string;
}) {
  const result = await pool.query(
    "INSERT INTO fee_records (vendor_id,fee_type,amount,fee_date,paid,notes) VALUES($1,$2,$3,$4,false,$5) RETURNING *",
    [data.vendorId, data.feeType, data.amount, data.feeDate, data.notes]
  );
  return result.rows[0];
}

export async function updateFeeRecord(id: number, paid: boolean) {
  const result = await pool.query(
    "UPDATE fee_records SET paid=$1 WHERE id=$2 RETURNING *",
    [paid, id]
  );
  return result.rows[0];
}

export async function updateUserPassword(email: string, newPassword: string) {
  const hashed = hashPassword(newPassword);
  const result = await pool.query(
    "UPDATE users SET password=$1 WHERE email=$2 RETURNING id",
    [hashed, email]
  );
  return result.rows[0] || null;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: number;
  message: string;
  type: string;
}) {
  const result = await pool.query(
    "INSERT INTO notifications (user_id, message, type) VALUES ($1,$2,$3) RETURNING *",
    [data.userId, data.message, data.type]
  );
  return result.rows[0];
}

export async function getNotifications(userId: number) {
  const result = await pool.query(
    "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60",
    [userId]
  );
  return result.rows;
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false",
    [userId]
  );
  return parseInt(result.rows[0].count) || 0;
}

export async function markNotificationRead(id: number, userId: number) {
  await pool.query(
    "UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",
    [id, userId]
  );
}

export async function markAllNotificationsRead(userId: number) {
  await pool.query(
    "UPDATE notifications SET is_read=true WHERE user_id=$1",
    [userId]
  );
}

export async function getAnalytics() {
  const [ordersR, pendingR, cancelledR, productsR, vendorsR, recentR, feesR, settingsR] =
    await Promise.all([
      pool.query(
        "SELECT COUNT(*) as total_orders, COALESCE(SUM(total),0) as total_revenue FROM orders"
      ),
      pool.query(
        "SELECT COUNT(*) as pending FROM orders WHERE status='pending'"
      ),
      pool.query(
        "SELECT COUNT(*) as cancelled FROM orders WHERE status='cancelled'"
      ),
      pool.query(
        "SELECT COUNT(*) as total_products, COUNT(*) FILTER (WHERE is_approved=false AND rejection_reason IS NULL) as pending_approval FROM products"
      ),
      pool.query("SELECT COUNT(*) as total_vendors FROM users WHERE role='vendor'"),
      pool.query(
        "SELECT o.id,o.total,o.status,o.created_at,u.name as user_name FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 5"
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount) FILTER (WHERE paid=true),0) as collected, COALESCE(SUM(amount) FILTER (WHERE paid=false),0) as pending FROM fee_records"
      ),
      pool.query("SELECT value FROM app_settings WHERE key='delivery_charge' LIMIT 1"),
    ]);

  return {
    totalOrders: parseInt(ordersR.rows[0].total_orders) || 0,
    totalRevenue: parseFloat(ordersR.rows[0].total_revenue) || 0,
    pendingOrders: parseInt(pendingR.rows[0].pending) || 0,
    cancelledOrders: parseInt(cancelledR.rows[0].cancelled) || 0,
    totalProducts: parseInt(productsR.rows[0].total_products) || 0,
    pendingApproval: parseInt(productsR.rows[0].pending_approval) || 0,
    totalVendors: parseInt(vendorsR.rows[0].total_vendors) || 0,
    feesCollected: parseFloat(feesR.rows[0].collected) || 0,
    feesPending: parseFloat(feesR.rows[0].pending) || 0,
    deliveryCharge: settingsR.rows[0] ? parseFloat(settingsR.rows[0].value) || 20 : 20,
    recentOrders: recentR.rows,
  };
}
