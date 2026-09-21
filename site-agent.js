/* ───────────────────────────────────────────────────────────
   site-agent.js — Matt's AI concierge (ElevenLabs ConvAI)

   Mounts a voice agent that can talk about Matt's work, scroll
   the visitor to the part of the page under discussion, and put
   a booking button on screen.

   Set AGENT_ID below to go live. While it holds the placeholder
   this file does nothing at all: no widget, no network request,
   no DOM change. The site renders exactly as it does today.
   ─────────────────────────────────────────────────────────── */

(function () {
"use strict";

const AGENT_ID = "agent_3101m32c4q90ffdsrwjz7hkzfcgt";

const EMBED_SRC   = "https://unpkg.com/@elevenlabs/convai-widget-embed";
const BOOKING_URL = "https://calendly.com/mattryansterbenz7/30-minute-meeting-with-matt";

/* Where the agent can send a visitor. Keys are what the agent says;
   values are on-page anchors, or a path for another page. */
const SECTIONS = {
  top:         "#top",
  about:       "#about",
  work:        "#work",
  experience:  "#work",
  cases:       "#work",
  coop:        "#building",
  building:    "#building",
  principles:  "#principles",
  values:      "#principles",
  looking:     "#looking-for",
  role:        "#looking-for",
  testimonials:"#testimonials",
  contact:     "#contact",
  radar:       "/experience"
};

function agentConfigured(){
  return typeof AGENT_ID === "string" && AGENT_ID.startsWith("agent_");
}

function showBookingLink(){
  if (document.getElementById("agent-booking-card")) return "The booking button is already on screen.";
  const a = document.createElement("a");
  a.id = "agent-booking-card";
  a.href = BOOKING_URL;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = "Book time with Matt →";
  Object.assign(a.style, {
    position: "fixed", bottom: "104px", right: "24px", zIndex: "2147483646",
    background: "var(--coral, #F4505C)", color: "#fff", padding: "14px 24px",
    borderRadius: "999px", fontWeight: "600", fontFamily: "inherit",
    fontSize: "15px", textDecoration: "none",
    boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)"
  });
  document.body.appendChild(a);
  return "Booking button is now on the visitor's screen.";
}

function navigateToSection({ section }){
  const key = String(section || "").toLowerCase().trim();
  const target = SECTIONS[key] || SECTIONS[key.replace(/[^a-z]/g, "")];
  if (!target) return `No section called ${section}.`;
  if (target.startsWith("/")) {
    setTimeout(() => { window.location.href = target; }, 400);
    return `Taking them to the ${key} page.`;
  }
  const el = document.querySelector(target);
  if (!el) return `That section isn't on this page.`;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return `Scrolled the visitor to the ${key} section.`;
}

function mountAgent(){
  if (!agentConfigured()) return;

  const host = document.createElement("div");
  host.id = "site-agent-mount";
  document.body.appendChild(host);

  const el = document.createElement("elevenlabs-convai");
  el.setAttribute("agent-id", AGENT_ID);
  el.setAttribute("dynamic-variables", JSON.stringify({
    page_title: document.title,
    page_path:  location.pathname
  }));

  // register client tools BEFORE the element is appended, so the call
  // event can't fire ahead of the handler
  el.addEventListener("elevenlabs-convai:call", (event) => {
    event.detail.config.clientTools = {
      show_booking_link: showBookingLink,
      navigate_to_page: navigateToSection,
      navigate_to_section: navigateToSection
    };
  });

  host.appendChild(el);

  const s = document.createElement("script");
  s.src = EMBED_SRC;
  s.async = true;
  document.body.appendChild(s);
}

mountAgent();
})();
