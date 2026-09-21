/* ───────────────────────────────────────────────────────────
   Rep.ai demo — visitor context + ElevenLabs widget mounting

   Paste your agent id below. The widget re-mounts whenever the
   visitor persona or the current page changes, so the agent
   always knows who it's talking to and what they're looking at.
   ─────────────────────────────────────────────────────────── */

const AGENT_ID = "agent_4401m30qq5txe1k91ej31g213qa1";

const PERSONAS = {
  enterprise: {
    label:"Enterprise",
    company:"Northwind Logistics", size:"2,400",
    dwell:"3m 12s", source:"Paid · LinkedIn", status:"Target account",
    vars:{ company_name:"Northwind Logistics", employee_count:"2400",
           utm_source:"linkedin_paid", account_status:"target_account",
           visitor_type:"enterprise_prospect" }
  },
  founder: {
    label:"Solo founder",
    company:"Unknown (solo)", size:"1–10",
    dwell:"0m 48s", source:"Organic · Google", status:"Unqualified",
    vars:{ company_name:"unknown", employee_count:"5",
           utm_source:"organic", account_status:"unknown",
           visitor_type:"small_business" }
  },
  customer: {
    label:"Existing customer",
    company:"Gravity Systems", size:"600",
    dwell:"6m 05s", source:"Direct", status:"Active customer",
    vars:{ company_name:"Gravity Systems", employee_count:"600",
           utm_source:"direct", account_status:"existing_customer",
           visitor_type:"customer" }
  }
};

const KEY = "repai_demo_persona";
const current = () => sessionStorage.getItem(KEY) || "enterprise";
const pageUrl = () => document.body.dataset.page || "/";

function mountWidget(){
  const host = document.getElementById("convai-mount");
  if(!host) return;
  const p = PERSONAS[current()];
  const vars = Object.assign({}, p.vars, { page_url: pageUrl() });
  host.innerHTML = "";
  const el = document.createElement("elevenlabs-convai");
  el.setAttribute("agent-id", AGENT_ID);
  el.setAttribute("dynamic-variables", JSON.stringify(vars));
  el.addEventListener("elevenlabs-convai:call", (event) => {
    event.detail.config.clientTools = {
      navigate_to_page: ({ page }) => {
        const routes = {
          home:     "index.html",
          platform: "platform.html",
          pricing:  "pricing.html",
          blog:     "blog.html",
          docs:     "docs.html"
        };
        const target = routes[String(page).toLowerCase().trim()];
        if (!target) return `No page called ${page}.`;
        setTimeout(() => { window.location.href = target; }, 600);
        return `Navigating to the ${page} page now.`;
      },
      show_booking_link: () => {
        if (document.getElementById("booking-card")) return "Already showing.";
        const a = document.createElement("a");
        a.id = "booking-card";
        a.href = "https://calendly.com/mattryansterbenz7/30-minute-meeting-with-matt";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Book time with Matt →";
        Object.assign(a.style, {
          position: "fixed", bottom: "24px", left: "24px", zIndex: "2147483647",
          background: "#E8752F", color: "#fff", padding: "16px 26px",
          borderRadius: "999px", fontWeight: "600", fontFamily: "inherit",
          textDecoration: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)"
        });
        document.body.appendChild(a);
        return "Booking button is now on the visitor's screen.";
      }
    };
  });
  host.appendChild(el);
}

function paintConsole(){
  const p = PERSONAS[current()];
  const set = (id, val) => { const n = document.getElementById(id); if(n) n.textContent = val; };
  set("f-company", p.company);
  set("f-size",    p.size);
  set("f-page",    pageUrl());
  set("f-dwell",   p.dwell);
  set("f-source",  p.source);
  set("f-status",  p.status);
  document.querySelectorAll(".chip").forEach(b =>
    b.setAttribute("aria-pressed", b.dataset.persona === current() ? "true" : "false"));
}

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    sessionStorage.setItem(KEY, btn.dataset.persona);
    paintConsole();
    mountWidget();
  });
});

paintConsole();
mountWidget();
