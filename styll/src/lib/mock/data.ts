// Mock data for demo mode — realistic Italian barbershop

// ── Consistent IDs ──────────────────────────────────────────────────────────
export const TENANT_ID = 'a0000000-0000-4000-8000-000000000001'
export const PROFILE_ADMIN_ID = 'b0000000-0000-4000-8000-000000000000'
export const PROFILE_MARCO_ID = 'b0000000-0000-4000-8000-000000000001'
export const PROFILE_LUCA_ID = 'b0000000-0000-4000-8000-000000000002'
export const STAFF_MARCO_ID = 'c0000000-0000-4000-8000-000000000001'
export const STAFF_LUCA_ID = 'c0000000-0000-4000-8000-000000000002'
export const LOCATION_ID = 'd0000000-0000-4000-8000-000000000001'
export const PLAN_ID = 'e0000000-0000-4000-8000-000000000001'
export const SUBSCRIPTION_ID = 'f0000000-0000-4000-8000-000000000001'
export const LOYALTY_CONFIG_ID = 'a1000000-0000-4000-8000-000000000001'

const clientId = (n: number) => `10000000-0000-4000-8000-00000000000${n}`
const serviceId = (n: number) => `20000000-0000-4000-8000-00000000000${n}`
const productId = (n: number) => `30000000-0000-4000-8000-00000000000${n}`
const appointmentId = (n: number) => `40000000-0000-4000-8000-00000000000${n}`
const rewardId = (n: number) => `50000000-0000-4000-8000-00000000000${n}`

const rid = (prefix: string, n: number) =>
  `${prefix}00000-0000-4000-8000-00000000${String(n).padStart(4, '0')}`

// ── Profiles ────────────────────────────────────────────────────────────────
const profiles = [
  {
    id: PROFILE_ADMIN_ID,
    user_type: 'admin',
    full_name: 'Admin Styll',
    phone: '+39 300 0000000',
    avatar_url: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
  },
  {
    id: PROFILE_MARCO_ID,
    user_type: 'staff',
    full_name: 'Marco Ferretti',
    phone: '+39 333 1234567',
    avatar_url: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
  },
  {
    id: PROFILE_LUCA_ID,
    user_type: 'staff',
    full_name: 'Luca Esposito',
    phone: '+39 345 6789012',
    avatar_url: null,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
  },
]

// ── Tenants ─────────────────────────────────────────────────────────────────
const tenants = [
  {
    id: TENANT_ID,
    business_name: "Marco's Barber Shop",
    slug: 'marcos-barber-shop',
    timezone: 'Europe/Rome',
    primary_color: '#1a1a2e',
    secondary_color: '#e94560',
    font_family: 'Inter',
    logo_url: null,
    feature_flag_overrides: {},
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
  },
]

// ── Staff members (with nested profiles for joins) ──────────────────────────
const staff_members = [
  {
    id: STAFF_MARCO_ID,
    tenant_id: TENANT_ID,
    profile_id: PROFILE_MARCO_ID,
    role: 'owner',
    is_active: true,
    deleted_at: null,
    deleted_by: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
    profiles: { full_name: 'Marco Ferretti', phone: '+39 333 1234567', avatar_url: null },
  },
  {
    id: STAFF_LUCA_ID,
    tenant_id: TENANT_ID,
    profile_id: PROFILE_LUCA_ID,
    role: 'staff',
    is_active: true,
    deleted_at: null,
    deleted_by: null,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
    profiles: { full_name: 'Luca Esposito', phone: '+39 345 6789012', avatar_url: null },
  },
]

// ── Subscription plans ──────────────────────────────────────────────────────
const subscriptionPlan = {
  id: PLAN_ID,
  name: 'Starter',
  slug: 'starter',
  price_monthly: 0,
  price_yearly: 0,
  trial_days: 14,
  max_staff: 2,
  max_locations: 1,
  feature_flags: {
    bookings: true,
    loyalty_basic: true,
    churn_detector: true,
    gamification: false,
    qr_walkin: false,
    win_back_auto: false,
    ai_coach: false,
    multi_location: false,
  },
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const subscription_plans = [subscriptionPlan]

// ── Tenant subscriptions (with nested plan) ─────────────────────────────────
const tenant_subscriptions = [
  {
    id: SUBSCRIPTION_ID,
    tenant_id: TENANT_ID,
    plan_id: PLAN_ID,
    status: 'trial',
    trial_ends_at: '2026-04-15T00:00:00Z',
    current_period_start: '2026-01-15T00:00:00Z',
    current_period_end: '2026-04-15T00:00:00Z',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
    subscription_plans: subscriptionPlan,
  },
]

// ── Locations ───────────────────────────────────────────────────────────────
const locations = [
  {
    id: LOCATION_ID,
    tenant_id: TENANT_ID,
    name: 'Sede principale',
    address: 'Via Roma 42',
    city: 'Milano',
    zip_code: '20121',
    phone: '+39 02 1234567',
    email: 'info@marcosbarber.it',
    latitude: null,
    longitude: null,
    timezone: null,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
  },
]

// ── Services ────────────────────────────────────────────────────────────────
const services = [
  { id: serviceId(1), tenant_id: TENANT_ID, name: 'Taglio Classico', description: 'Taglio uomo classico con forbici e macchinetta', price: 18, duration_minutes: 30, category: 'Taglio', display_order: 1, is_active: true, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: serviceId(2), tenant_id: TENANT_ID, name: 'Taglio + Barba', description: 'Taglio completo con regolazione barba', price: 28, duration_minutes: 45, category: 'Taglio', display_order: 2, is_active: true, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: serviceId(3), tenant_id: TENANT_ID, name: 'Barba', description: 'Regolazione e rifinitura barba con rasoio', price: 12, duration_minutes: 20, category: 'Barba', display_order: 3, is_active: true, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: serviceId(4), tenant_id: TENANT_ID, name: 'Shampoo & Styling', description: 'Lavaggio e piega con prodotti professionali', price: 15, duration_minutes: 25, category: 'Styling', display_order: 4, is_active: true, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: serviceId(5), tenant_id: TENANT_ID, name: 'Colorazione', description: 'Colorazione professionale capelli uomo', price: 35, duration_minutes: 60, category: 'Colore', display_order: 5, is_active: true, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: serviceId(6), tenant_id: TENANT_ID, name: 'Trattamento Capelli', description: 'Trattamento rinforzante e nutriente', price: 25, duration_minutes: 40, category: 'Trattamento', display_order: 6, is_active: true, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
]

// ── Products (with nested product_inventory) ────────────────────────────────
const products = [
  { id: productId(1), tenant_id: TENANT_ID, name: 'American Crew Forming Cream', brand: 'American Crew', price_sell: 22, price_cost: 8, sku: 'AC-FC-01', category: 'Styling', is_active: true, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z', product_inventory: [{ id: rid('pi', 1), tenant_id: TENANT_ID, product_id: productId(1), location_id: LOCATION_ID, quantity: 15, low_stock_threshold: 5 }] },
  { id: productId(2), tenant_id: TENANT_ID, name: 'Proraso Crema Pre-Barba', brand: 'Proraso', price_sell: 12, price_cost: 4, sku: 'PR-CPB-01', category: 'Barba', is_active: true, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z', product_inventory: [{ id: rid('pi', 2), tenant_id: TENANT_ID, product_id: productId(2), location_id: LOCATION_ID, quantity: 3, low_stock_threshold: 5 }] },
  { id: productId(3), tenant_id: TENANT_ID, name: 'Uppercut Deluxe Pomade', brand: 'Uppercut Deluxe', price_sell: 25, price_cost: 10, sku: 'UC-POM-01', category: 'Styling', is_active: true, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z', product_inventory: [{ id: rid('pi', 3), tenant_id: TENANT_ID, product_id: productId(3), location_id: LOCATION_ID, quantity: 8, low_stock_threshold: 5 }] },
  { id: productId(4), tenant_id: TENANT_ID, name: 'Olio da Barba Bio', brand: 'Olio Bio', price_sell: 18, price_cost: 6, sku: 'OBB-01', category: 'Barba', is_active: true, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z', product_inventory: [{ id: rid('pi', 4), tenant_id: TENANT_ID, product_id: productId(4), location_id: LOCATION_ID, quantity: 12, low_stock_threshold: 5 }] },
]

const product_inventory = products.flatMap(p => p.product_inventory)

// ── Clients ─────────────────────────────────────────────────────────────────
interface ClientSeed {
  name: string; phone: string; email: string | null; dob: string | null
  churn: 'green' | 'yellow' | 'red'; vip: number; visits: number
  lastVisit: string; daysSince: number; avgDays: number
  spentServices: number; spentProducts: number
  loyaltyPts: number; availPts: number; tier: 'bronze' | 'silver' | 'gold'
  streak: number; longestStreak: number; tierPts: number; createdAt: string
}

const clientSeeds: ClientSeed[] = [
  { name: 'Antonio Rossi', phone: '+39 320 1111111', email: 'a.rossi@gmail.com', dob: '1985-03-15', churn: 'green', vip: 85, visits: 24, lastVisit: '2026-03-28', daysSince: 3, avgDays: 21, spentServices: 480, spentProducts: 66, loyaltyPts: 2400, availPts: 1900, tier: 'gold', streak: 12, longestStreak: 12, tierPts: 2400, createdAt: '2025-06-10T10:00:00Z' },
  { name: 'Giovanni Bianchi', phone: '+39 328 2222222', email: 'g.bianchi@email.it', dob: '1990-07-22', churn: 'green', vip: 72, visits: 18, lastVisit: '2026-03-25', daysSince: 6, avgDays: 25, spentServices: 360, spentProducts: 44, loyaltyPts: 1800, availPts: 1500, tier: 'silver', streak: 8, longestStreak: 10, tierPts: 1800, createdAt: '2025-08-05T10:00:00Z' },
  { name: 'Francesco Verdi', phone: '+39 331 3333333', email: null, dob: '1978-11-30', churn: 'green', vip: 60, visits: 12, lastVisit: '2026-03-20', daysSince: 11, avgDays: 28, spentServices: 216, spentProducts: 25, loyaltyPts: 1200, availPts: 900, tier: 'silver', streak: 5, longestStreak: 7, tierPts: 1200, createdAt: '2025-09-12T10:00:00Z' },
  { name: 'Matteo Romano', phone: '+39 347 4444444', email: 'm.romano@libero.it', dob: '1995-01-08', churn: 'yellow', vip: 45, visits: 8, lastVisit: '2026-03-01', daysSince: 30, avgDays: 30, spentServices: 144, spentProducts: 0, loyaltyPts: 800, availPts: 600, tier: 'bronze', streak: 3, longestStreak: 5, tierPts: 800, createdAt: '2025-10-20T10:00:00Z' },
  { name: 'Alessandro Colombo', phone: '+39 339 5555555', email: null, dob: null, churn: 'yellow', vip: 38, visits: 6, lastVisit: '2026-02-28', daysSince: 31, avgDays: 35, spentServices: 108, spentProducts: 22, loyaltyPts: 600, availPts: 400, tier: 'bronze', streak: 2, longestStreak: 4, tierPts: 600, createdAt: '2025-11-05T10:00:00Z' },
  { name: 'Davide Ricci', phone: '+39 366 6666666', email: 'd.ricci@gmail.com', dob: '1988-05-14', churn: 'red', vip: 20, visits: 4, lastVisit: '2026-01-15', daysSince: 75, avgDays: 40, spentServices: 72, spentProducts: 0, loyaltyPts: 400, availPts: 300, tier: 'bronze', streak: 0, longestStreak: 3, tierPts: 400, createdAt: '2025-11-20T10:00:00Z' },
  { name: 'Simone Marino', phone: '+39 348 7777777', email: null, dob: '1992-09-03', churn: 'red', vip: 15, visits: 3, lastVisit: '2026-01-05', daysSince: 85, avgDays: 45, spentServices: 54, spentProducts: 12, loyaltyPts: 300, availPts: 200, tier: 'bronze', streak: 0, longestStreak: 2, tierPts: 300, createdAt: '2025-12-01T10:00:00Z' },
  { name: 'Filippo Greco', phone: '+39 333 8888888', email: 'f.greco@outlook.com', dob: '1982-12-28', churn: 'green', vip: 55, visits: 10, lastVisit: '2026-03-22', daysSince: 9, avgDays: 24, spentServices: 200, spentProducts: 18, loyaltyPts: 1000, availPts: 700, tier: 'silver', streak: 4, longestStreak: 6, tierPts: 1000, createdAt: '2025-09-28T10:00:00Z' },
  { name: 'Lorenzo Costa', phone: '+39 340 9999999', email: null, dob: '1998-06-17', churn: 'green', vip: 48, visits: 7, lastVisit: '2026-03-26', daysSince: 5, avgDays: 22, spentServices: 126, spentProducts: 25, loyaltyPts: 700, availPts: 500, tier: 'bronze', streak: 3, longestStreak: 5, tierPts: 700, createdAt: '2025-10-15T10:00:00Z' },
  { name: 'Tommaso Fontana', phone: '+39 351 0000000', email: 't.fontana@gmail.com', dob: '1975-04-02', churn: 'green', vip: 65, visits: 14, lastVisit: '2026-03-29', daysSince: 2, avgDays: 20, spentServices: 280, spentProducts: 40, loyaltyPts: 1400, availPts: 1100, tier: 'silver', streak: 6, longestStreak: 8, tierPts: 1400, createdAt: '2025-07-22T10:00:00Z' },
]

const clients = clientSeeds.map((c, i) => ({
  id: clientId(i + 1),
  tenant_id: TENANT_ID,
  full_name: c.name,
  phone: c.phone,
  email: c.email,
  date_of_birth: c.dob,
  preferred_contact_channel: 'whatsapp',
  tags: [] as string[],
  profile_id: null,
  referred_by: null,
  created_by: PROFILE_MARCO_ID,
  deleted_at: null,
  deleted_by: null,
  created_at: c.createdAt,
  updated_at: '2026-03-30T12:00:00Z',
  client_analytics: {
    id: rid('ca', i + 1),
    tenant_id: TENANT_ID,
    client_id: clientId(i + 1),
    churn_status: c.churn,
    vip_score: c.vip,
    total_visits: c.visits,
    last_visit_date: c.lastVisit,
    days_since_last_visit: c.daysSince,
    average_days_between_visits: c.avgDays,
    total_spent_services: c.spentServices,
    total_spent_products: c.spentProducts,
    created_at: c.createdAt,
    updated_at: '2026-03-30T12:00:00Z',
  },
  client_loyalty: {
    id: rid('cl', i + 1),
    tenant_id: TENANT_ID,
    client_id: clientId(i + 1),
    total_points: c.loyaltyPts,
    available_points: c.availPts,
    current_tier: c.tier,
    current_streak: c.streak,
    longest_streak: c.longestStreak,
    tier_points_this_year: c.tierPts,
    last_visit_date: c.lastVisit,
    tier_year: 2026,
    created_at: c.createdAt,
    updated_at: '2026-03-30T12:00:00Z',
  },
}))

const client_analytics = clients.map(c => c.client_analytics)
const client_loyalty = clients.map(c => c.client_loyalty)

// ── Appointments (today = 2026-03-31) ───────────────────────────────────────
interface ApptSeed {
  clientIdx: number; staffId: string; staffName: string; startHour: string
  svcIdx: number; svcName: string; svcDuration: number; price: number
  status: string; payMethod: 'cash' | 'card_terminal' | null
}

const apptSeeds: ApptSeed[] = [
  { clientIdx: 1, staffId: STAFF_MARCO_ID, staffName: 'Marco Ferretti', startHour: '09:00', svcIdx: 1, svcName: 'Taglio Classico', svcDuration: 30, price: 18, status: 'completed', payMethod: 'cash' },
  { clientIdx: 2, staffId: STAFF_LUCA_ID, staffName: 'Luca Esposito', startHour: '09:30', svcIdx: 2, svcName: 'Taglio + Barba', svcDuration: 45, price: 28, status: 'completed', payMethod: 'card_terminal' },
  { clientIdx: 3, staffId: STAFF_MARCO_ID, staffName: 'Marco Ferretti', startHour: '10:00', svcIdx: 3, svcName: 'Barba', svcDuration: 20, price: 12, status: 'completed', payMethod: 'cash' },
  { clientIdx: 4, staffId: STAFF_LUCA_ID, staffName: 'Luca Esposito', startHour: '11:00', svcIdx: 1, svcName: 'Taglio Classico', svcDuration: 30, price: 18, status: 'confirmed', payMethod: null },
  { clientIdx: 5, staffId: STAFF_MARCO_ID, staffName: 'Marco Ferretti', startHour: '14:00', svcIdx: 2, svcName: 'Taglio + Barba', svcDuration: 45, price: 28, status: 'confirmed', payMethod: null },
  { clientIdx: 8, staffId: STAFF_LUCA_ID, staffName: 'Luca Esposito', startHour: '15:00', svcIdx: 4, svcName: 'Shampoo & Styling', svcDuration: 25, price: 15, status: 'confirmed', payMethod: null },
  { clientIdx: 9, staffId: STAFF_MARCO_ID, staffName: 'Marco Ferretti', startHour: '16:00', svcIdx: 5, svcName: 'Colorazione', svcDuration: 60, price: 35, status: 'pending', payMethod: null },
  { clientIdx: 10, staffId: STAFF_LUCA_ID, staffName: 'Luca Esposito', startHour: '17:00', svcIdx: 6, svcName: 'Trattamento Capelli', svcDuration: 40, price: 25, status: 'cancelled', payMethod: null },
]

const appointments = apptSeeds.map((a, i) => {
  const start = `2026-03-31T${a.startHour}:00Z`
  const endDate = new Date(new Date(start).getTime() + a.svcDuration * 60 * 1000)
  const end = endDate.toISOString()
  const client = clientSeeds[a.clientIdx - 1]
  const paymentId = a.payMethod ? rid('pay', i + 1) : null

  return {
    id: appointmentId(i + 1),
    tenant_id: TENANT_ID,
    client_id: clientId(a.clientIdx),
    staff_id: a.staffId,
    location_id: LOCATION_ID,
    start_time: start,
    end_time: end,
    status: a.status,
    booking_source: 'dashboard_owner',
    notes: null,
    deleted_at: null,
    deleted_by: null,
    created_at: '2026-03-30T18:00:00Z',
    updated_at: '2026-03-31T08:00:00Z',
    clients: { full_name: client.name, phone: client.phone },
    staff_members: {
      id: a.staffId,
      profiles: { full_name: a.staffName, avatar_url: null },
    },
    appointment_services: [
      {
        id: rid('as', i + 1),
        tenant_id: TENANT_ID,
        appointment_id: appointmentId(i + 1),
        service_id: serviceId(a.svcIdx),
        price_at_booking: a.price,
        services: { name: a.svcName, duration_minutes: a.svcDuration },
      },
    ],
    appointment_products: [] as unknown[],
    payments: paymentId
      ? [{ id: paymentId, amount: a.price, payment_method: a.payMethod, status: 'completed' }]
      : [],
  }
})

const appointment_services = appointments.flatMap(a => a.appointment_services)

// ── Payments ────────────────────────────────────────────────────────────────
const todayPayments = appointments
  .filter(a => a.payments.length > 0)
  .map(a => ({
    id: a.payments[0].id,
    tenant_id: TENANT_ID,
    appointment_id: a.id,
    amount: a.payments[0].amount,
    payment_method: a.payments[0].payment_method,
    status: 'completed' as const,
    paid_at: a.start_time.replace(':00Z', ':30Z'),
    created_at: a.start_time.replace(':00Z', ':30Z'),
  }))

const pastWeekPayments = [
  { id: rid('pay', 20), tenant_id: TENANT_ID, appointment_id: null, amount: 28, payment_method: 'card_terminal', status: 'completed', paid_at: '2026-03-30T10:00:00Z', created_at: '2026-03-30T10:00:00Z' },
  { id: rid('pay', 21), tenant_id: TENANT_ID, appointment_id: null, amount: 18, payment_method: 'cash', status: 'completed', paid_at: '2026-03-30T11:00:00Z', created_at: '2026-03-30T11:00:00Z' },
  { id: rid('pay', 22), tenant_id: TENANT_ID, appointment_id: null, amount: 35, payment_method: 'card_terminal', status: 'completed', paid_at: '2026-03-29T09:30:00Z', created_at: '2026-03-29T09:30:00Z' },
  { id: rid('pay', 23), tenant_id: TENANT_ID, appointment_id: null, amount: 18, payment_method: 'cash', status: 'completed', paid_at: '2026-03-29T14:00:00Z', created_at: '2026-03-29T14:00:00Z' },
  { id: rid('pay', 24), tenant_id: TENANT_ID, appointment_id: null, amount: 28, payment_method: 'cash', status: 'completed', paid_at: '2026-03-28T10:00:00Z', created_at: '2026-03-28T10:00:00Z' },
  { id: rid('pay', 25), tenant_id: TENANT_ID, appointment_id: null, amount: 12, payment_method: 'cash', status: 'completed', paid_at: '2026-03-28T11:30:00Z', created_at: '2026-03-28T11:30:00Z' },
  { id: rid('pay', 26), tenant_id: TENANT_ID, appointment_id: null, amount: 25, payment_method: 'card_terminal', status: 'completed', paid_at: '2026-03-27T15:00:00Z', created_at: '2026-03-27T15:00:00Z' },
  { id: rid('pay', 27), tenant_id: TENANT_ID, appointment_id: null, amount: 18, payment_method: 'cash', status: 'completed', paid_at: '2026-03-27T09:00:00Z', created_at: '2026-03-27T09:00:00Z' },
  { id: rid('pay', 28), tenant_id: TENANT_ID, appointment_id: null, amount: 28, payment_method: 'card_terminal', status: 'completed', paid_at: '2026-03-26T10:30:00Z', created_at: '2026-03-26T10:30:00Z' },
  { id: rid('pay', 29), tenant_id: TENANT_ID, appointment_id: null, amount: 15, payment_method: 'cash', status: 'completed', paid_at: '2026-03-26T16:00:00Z', created_at: '2026-03-26T16:00:00Z' },
  { id: rid('pay', 30), tenant_id: TENANT_ID, appointment_id: null, amount: 18, payment_method: 'cash', status: 'completed', paid_at: '2026-03-25T11:00:00Z', created_at: '2026-03-25T11:00:00Z' },
]

const payments = [...todayPayments, ...pastWeekPayments]

// ── Loyalty configs ─────────────────────────────────────────────────────────
const loyalty_configs = [
  {
    id: LOYALTY_CONFIG_ID,
    tenant_id: TENANT_ID,
    is_active: true,
    template: 'classic',
    points_per_visit: 100,
    points_per_euro: 10,
    streak_threshold_days: 45,
    version: 1,
    ended_at: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-30T12:00:00Z',
  },
]

// ── Rewards ─────────────────────────────────────────────────────────────────
const rewards = [
  { id: rewardId(1), tenant_id: TENANT_ID, name: 'Taglio Gratuito', description: 'Un taglio classico gratuito', points_cost: 500, is_active: true, display_order: 1, stock: null, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: rewardId(2), tenant_id: TENANT_ID, name: 'Prodotto in Omaggio', description: 'Un prodotto styling a scelta', points_cost: 300, is_active: true, display_order: 2, stock: null, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
  { id: rewardId(3), tenant_id: TENANT_ID, name: 'Sconto 20%', description: 'Sconto del 20% sul prossimo servizio', points_cost: 200, is_active: true, display_order: 3, stock: null, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-30T12:00:00Z' },
]

// ── Loyalty transactions (Antonio Rossi) ────────────────────────────────────
const loyalty_transactions = [
  { id: rid('lt', 1), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 28/03', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-03-28T10:30:00Z' },
  { id: rid('lt', 2), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 20/03', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-03-20T11:00:00Z' },
  { id: rid('lt', 3), tenant_id: TENANT_ID, client_id: clientId(1), type: 'bonus', points: 50, description: 'Bonus streak 10 visite', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-03-15T09:00:00Z' },
  { id: rid('lt', 4), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 10/03', appointment_id: null, staff_id: STAFF_LUCA_ID, loyalty_config_version: 1, created_at: '2026-03-10T14:00:00Z' },
  { id: rid('lt', 5), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 01/03', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-03-01T10:00:00Z' },
  { id: rid('lt', 6), tenant_id: TENANT_ID, client_id: clientId(1), type: 'bonus', points: 50, description: 'Bonus referral Giovanni', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-02-25T15:00:00Z' },
  { id: rid('lt', 7), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 20/02', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-02-20T10:30:00Z' },
  { id: rid('lt', 8), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 10/02', appointment_id: null, staff_id: STAFF_LUCA_ID, loyalty_config_version: 1, created_at: '2026-02-10T11:00:00Z' },
  { id: rid('lt', 9), tenant_id: TENANT_ID, client_id: clientId(1), type: 'redeem', points: -500, description: 'Riscatto: Taglio Gratuito', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-02-05T09:30:00Z' },
  { id: rid('lt', 10), tenant_id: TENANT_ID, client_id: clientId(1), type: 'earn', points: 100, description: 'Visita del 01/02', appointment_id: null, staff_id: STAFF_MARCO_ID, loyalty_config_version: 1, created_at: '2026-02-01T10:00:00Z' },
]

// ── Staff notifications ─────────────────────────────────────────────────────
const staff_notifications = [
  { id: rid('sn', 1), tenant_id: TENANT_ID, staff_id: STAFF_MARCO_ID, type: 'appointment', title: 'Nuovo appuntamento', body: 'Lorenzo Costa ha prenotato per domani alle 16:00', is_read: false, read_at: null, created_at: '2026-03-31T08:00:00Z' },
  { id: rid('sn', 2), tenant_id: TENANT_ID, staff_id: null, type: 'loyalty', title: 'Traguardo raggiunto', body: 'Antonio Rossi ha raggiunto il livello Gold!', is_read: false, read_at: null, created_at: '2026-03-30T18:00:00Z' },
  { id: rid('sn', 3), tenant_id: TENANT_ID, staff_id: STAFF_MARCO_ID, type: 'system', title: 'Scorta bassa', body: "Proraso Crema Pre-Barba \u00e8 sotto la soglia minima (3 pezzi)", is_read: false, read_at: null, created_at: '2026-03-30T12:00:00Z' },
  { id: rid('sn', 4), tenant_id: TENANT_ID, staff_id: STAFF_MARCO_ID, type: 'appointment', title: 'Appuntamento completato', body: "Giovanni Bianchi \u2014 Taglio + Barba completato", is_read: true, read_at: '2026-03-30T11:00:00Z', created_at: '2026-03-30T10:30:00Z' },
  { id: rid('sn', 5), tenant_id: TENANT_ID, staff_id: null, type: 'system', title: 'Benvenuto su Styll!', body: 'Configura il tuo salone per iniziare', is_read: true, read_at: '2026-01-15T10:30:00Z', created_at: '2026-01-15T10:00:00Z' },
]

// ── Client notes (Antonio Rossi) ────────────────────────────────────────────
const client_notes = [
  {
    id: rid('cn', 1), tenant_id: TENANT_ID, client_id: clientId(1), staff_id: STAFF_MARCO_ID,
    note_text: "Preferisce il taglio corto ai lati, pi\u00f9 lungo sopra. Sfumatura media.",
    created_at: '2026-03-20T10:30:00Z',
    staff_members: { profiles: { full_name: 'Marco Ferretti' } },
  },
  {
    id: rid('cn', 2), tenant_id: TENANT_ID, client_id: clientId(1), staff_id: STAFF_MARCO_ID,
    note_text: "Allergia a prodotti con parabeni \u2014 usare solo linea bio.",
    created_at: '2026-02-15T09:00:00Z',
    staff_members: { profiles: { full_name: 'Marco Ferretti' } },
  },
]

// ── Empty tables ────────────────────────────────────────────────────────────
const client_consents: unknown[] = []
const reward_redemptions: unknown[] = []
const appointment_products: unknown[] = []
const admin_users: unknown[] = []
const tenant_activity_log: unknown[] = []

// ── Export mock store ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockStore: Record<string, any[]> = {
  profiles,
  tenants,
  staff_members,
  subscription_plans,
  tenant_subscriptions,
  locations,
  services,
  products,
  product_inventory,
  clients,
  client_analytics,
  client_loyalty,
  appointments,
  appointment_services,
  appointment_products,
  payments,
  loyalty_configs,
  rewards,
  loyalty_transactions,
  staff_notifications,
  client_notes,
  client_consents,
  reward_redemptions,
  admin_users,
  tenant_activity_log,
}
