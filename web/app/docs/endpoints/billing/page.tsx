import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing Endpoints' }

export default function BillingEndpointsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Billing Endpoints</h1>
      <p className="text-slate-400 mb-8 text-lg">Stripe-powered subscription management.</p>
      {[
        { method:'GET', path:'/v1/billing/plans', desc:'List all available plans with pricing and feature details.', resp:`{"plans":[{"id":1,"name":"free","price_cents":0,"daily_quota":500,"per_min_limit":10,"max_keys":1,"features":{"formats":["json"],"search":false}},...]}` },
        { method:'POST', path:'/v1/billing/subscribe', desc:'Start a Stripe Checkout session. POST body: {"plan":"starter"|"pro"}. Redirects user to Stripe.',resp:`{"checkout_url":"https://checkout.stripe.com/pay/cs_test_..."}` },
        { method:'GET', path:'/v1/billing/portal', desc:'Get a Stripe Customer Portal URL for managing subscriptions, payment methods, and invoices.', resp:`{"portal_url":"https://billing.stripe.com/session/..."}` },
        { method:'POST', path:'/v1/billing/webhook', desc:'Stripe webhook endpoint. Handles checkout.session.completed, subscription updates/deletion, and payment failures. Verify Stripe-Signature header.', resp:`(HTTP 200 OK)` },
      ].map(ep=>(
        <section key={ep.path} className="mb-8 p-6 bg-white/3 border border-white/8 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2.5 py-1 text-xs font-bold rounded font-mono ${
              ep.method==='GET'?'bg-blue-500/20 text-blue-400':'bg-green-500/20 text-green-400'
            }`}>{ep.method}</span>
            <code className="text-white font-mono text-sm">{ep.path}</code>
          </div>
          <p className="text-slate-400 text-sm mb-3">{ep.desc}</p>
          <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">{ep.resp}</pre>
        </section>
      ))}
    </div>
  )
}
