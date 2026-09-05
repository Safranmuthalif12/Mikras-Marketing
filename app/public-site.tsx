"use client";

import {
  ArrowRight, BarChart3, BriefcaseBusiness, Camera, Check, Clock, Code2,
  FileText, Headphones, Lightbulb, Mail, MapPin, Megaphone, Menu,
  MessageCircle, Network, Phone, Rocket, Search, Send, Target, Trophy, Users, X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Member, PublicData } from "@/lib/types";

const advantages = [
  { icon: Target, title: "Results-Driven", text: "Strategies focused on measurable growth and real ROI." },
  { icon: Lightbulb, title: "Creative Excellence", text: "Bold ideas and stunning content that make your brand unforgettable." },
  { icon: BarChart3, title: "Data-Powered", text: "Smart analytics and insights that drive better decisions." },
  { icon: Network, title: "Full-Funnel Approach", text: "End-to-end marketing solutions across every touchpoint." },
  { icon: Headphones, title: "Dedicated Support", text: "A committed team that stays close to your success." },
];

const services = [
  { icon: Megaphone, title: "Social Media Marketing", text: "Build brand awareness and engage your audience on the right platforms.", details: "We plan and manage a consistent social presence that connects content, community and campaign performance around your business goals.", benefits: ["Platform and audience strategy", "Monthly content calendar", "Creative post and short-video direction", "Community and performance reporting"] },
  { icon: Search, title: "Search Engine Optimization", text: "Rank higher, drive organic traffic, and grow your online visibility.", details: "Our SEO work improves how search engines understand your website while creating a clearer, faster experience for real customers.", benefits: ["Technical website audit", "Keyword and competitor research", "On-page content optimisation", "Ranking and traffic reports"] },
  { icon: FileText, title: "Content Marketing", text: "Compelling content that educates, engages, and converts.", details: "We turn brand knowledge into useful content that earns attention, builds trust and guides prospects towards an enquiry or purchase.", benefits: ["Content pillars and campaign themes", "Blogs, scripts and landing-page copy", "Brand voice development", "Conversion-focused content review"] },
  { icon: Target, title: "Paid Advertising", text: "High-performing campaigns that deliver leads and sales.", details: "Every paid campaign is structured around a measurable objective, tested with focused creative and refined using real performance data.", benefits: ["Meta and Google campaign setup", "Audience and funnel planning", "Creative testing and optimisation", "Lead and ROI performance reporting"] },
  { icon: Send, title: "Email Marketing", text: "Nurture leads and turn subscribers into loyal customers.", details: "We create email journeys that welcome, educate and re-engage your audience with messages that feel timely and genuinely useful.", benefits: ["Campaign and automation planning", "Email copy and design direction", "Audience segmentation", "Open, click and conversion analysis"] },
  { icon: Code2, title: "Website Design & Development", text: "Modern, responsive websites built for performance.", details: "We design and build polished digital experiences that make your offer clear, work smoothly on every screen and support measurable growth.", benefits: ["Responsive UX and interface design", "Fast, accessible development", "Lead and contact integrations", "Launch support and performance checks"] },
];

function BrandMark() {
  return <a className="ref-brand" href="#top" aria-label="MIKRAS Marketing home"><span className="ref-logo" aria-hidden="true"><i /><i /><b /></span><strong>MIKRAS <em>Marketing</em></strong></a>;
}

function MemberCard({ member, index }: { member: Member; index: number }) {
  return <Dialog><DialogTrigger asChild><button className={`ref-member-card member-tilt-${(index % 4) + 1}`} type="button">
    <span className="ref-member-photo">{member.photoUrl ? <img src={member.photoUrl} alt={member.name} /> : <span>{member.name.slice(0, 2).toUpperCase()}</span>}</span>
    <span className="ref-member-overlay"><strong>{member.name}</strong><small>{member.role}</small><i><ArrowRight size={16} /></i></span>
  </button></DialogTrigger><DialogContent className="member-dialog"><div className="dialog-photo">{member.photoUrl ? <img src={member.photoUrl} alt={member.name} /> : <span>{member.name.slice(0, 2).toUpperCase()}</span>}</div><DialogHeader><p className="eyebrow">MIKRAS TEAM</p><DialogTitle>{member.name}</DialogTitle><DialogDescription>{member.role}</DialogDescription></DialogHeader><p className="dialog-bio">{member.bio}</p><div className="dialog-socials">{member.linkedin && <a href={member.linkedin} aria-label={`${member.name} on LinkedIn`}><BriefcaseBusiness size={18} /></a>}{member.instagram && <a href={member.instagram} aria-label={`${member.name} on Instagram`}><Camera size={18} /></a>}{member.email && <a href={`mailto:${member.email}`} aria-label={`Email ${member.name}`}><Mail size={18} /></a>}</div></DialogContent></Dialog>;
}

export function PublicSite({ data }: { data: PublicData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const featuredId = data.packages.find((item) => item.featured)?.id ?? data.packages[1]?.id ?? data.packages[0]?.id;
  const [activePackage, setActivePackage] = useState(featuredId);
  const [activeService, setActiveService] = useState<number | null>(null);
  const [contactState, setContactState] = useState<{ type:"idle"|"sending"|"success"|"error"; message:string }>({ type:"idle", message:"" });
  const movingMembers = [...data.members, ...data.members];
  const { settings } = data;
  const whatsappNumber=settings.whatsapp.replace(/\D/g,"");
  const metricIcons = [Users, BarChart3, Trophy];

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setContactState({ type:"sending", message:"Sending your enquiry securely..." });
    try {
      const response = await fetch("/api/contact", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          name:values.get("name"), email:values.get("email"), phone:values.get("phone"), subject:values.get("subject"), message:values.get("message"),
          consent:values.get("consent")==="on", companyWebsite:values.get("companyWebsite"),
        }),
      });
      const result = await response.json() as { ok?:boolean;message?:string;error?:string };
      if (!response.ok || !result.ok) throw new Error(result.error || "We could not send your enquiry.");
      form.reset();
      setContactState({ type:"success", message:result.message || "Thanks — your enquiry has been received." });
    } catch (error) {
      setContactState({ type:"error", message:error instanceof Error ? error.message : "We could not send your enquiry. Please try again." });
    }
  }

  return <main id="top" className="ref-site">
    <header className="ref-header">
      <BrandMark />
      <nav className={menuOpen ? "ref-nav open" : "ref-nav"} aria-label="Main navigation">
        <a className="active" href="#top" onClick={() => setMenuOpen(false)}>Home</a>
        <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
        <a href="#packages" onClick={() => setMenuOpen(false)}>Packages</a>
        <a href="#team" onClick={() => setMenuOpen(false)}>Team</a>
        <a href="#advantage" onClick={() => setMenuOpen(false)}>About Us</a>
        <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
      </nav>
      <a className="ref-header-cta" href="#contact">Get Started Today</a>
      <button className="ref-menu" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
    </header>

    <section className="ref-hero">
      <div className="ref-hero-grid">
        <div className="ref-hero-copy">
          <h1><span>{settings.heroTitle}</span><span>{settings.heroAccent}</span></h1>
          <i className="cyan-line" />
          <p>{settings.heroText}</p>
          <a className="ref-orange-button" href="#contact">Get Started Today <ArrowRight size={18} /></a>
        </div>
        <div className="ref-hero-visual">
          <div className="ref-data-card reach"><small>Total Reach</small><strong>125K</strong><em>+25.4%</em><span><i /><i /><i /><i /></span></div>
          <div className="ref-data-card conversion"><small>Conversions</small><strong>3.2K</strong><em>+28.8%</em><span><i /><i /><i /><i /></span></div>
          <div className="ref-data-card roi"><small>ROI</small><strong>320%</strong><em>+42.1%</em><span><i /><i /><i /><i /></span></div>
          <img src="/mikras-dashboard-hero.png" alt="Digital marketing analytics dashboard with growth charts" />
          <div className="ref-glow-orb" />
        </div>
      </div>
    </section>

    <section className="ref-metrics-wrap" aria-label="Company results"><div className="ref-metrics">
      {data.stats.map((stat, index) => { const Icon = metricIcons[index] ?? Rocket; return <article key={stat.id}><Icon /><div><strong>{stat.value}{stat.suffix}</strong><span>{stat.label}</span></div></article>; })}
      <article><Rocket /><div><strong>5+</strong><span>Years of Excellence</span></div></article>
    </div></section>

    <section id="advantage" className="ref-white-section ref-advantage">
      <div className="ref-title"><h2>The MIKRAS Advantage</h2><i /></div>
      <div className="ref-advantage-grid">{advantages.map(({ icon: Icon, title, text }, index) => <article key={title} style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section id="services" className="ref-white-section ref-services">
      <div className="ref-statement-heading ref-statement-split">
        <div><p className="ref-heading-kicker">FULL-STACK MARKETING SOLUTIONS</p><h2>Growth needs more<br />than <em>noise.</em></h2></div>
        <p>Clear thinking, standout creative and disciplined execution — connected as one growth system.</p>
      </div>
      <p className="ref-section-note ref-interaction-note">Touch a service card to reveal its colour. Choose Learn More for the complete details.</p>
      <div className="ref-service-grid">{services.map(({ icon: Icon, title, text, details, benefits }, index) => <article
        key={title}
        tabIndex={0}
        onClick={() => setActiveService(index)}
        onFocus={() => setActiveService(index)}
        className={activeService === index ? "service-active" : ""}
        style={{ "--delay": `${index * 70}ms`, "--service-accent": index % 2 === 0 ? "#ff6508" : "#00b8ef" } as React.CSSProperties}
      >
        <div className={`ref-service-icon tone-${index + 1}`}><Icon /></div><h3>{title}</h3><p>{text}</p>
        <Dialog><DialogTrigger asChild><button className="ref-learn-more" type="button" onClick={(event) => event.stopPropagation()}>Learn More <ArrowRight size={14} /></button></DialogTrigger><DialogContent className="service-dialog">
          <div className={`service-dialog-icon tone-${index + 1}`}><Icon /></div>
          <DialogHeader><p className="eyebrow">MIKRAS SOLUTION</p><DialogTitle>{title}</DialogTitle><DialogDescription>{text}</DialogDescription></DialogHeader>
          <p className="service-dialog-detail">{details}</p><div className="service-benefits"><strong>What you get</strong><ul>{benefits.map((benefit) => <li key={benefit}><Check />{benefit}</li>)}</ul></div>
          <a className="service-dialog-cta" href="#contact">Discuss this service <ArrowRight /></a>
        </DialogContent></Dialog>
      </article>)}</div>
    </section>

    <section id="team" className="ref-white-section ref-team">
      <div className="ref-statement-heading ref-statement-split">
        <div><p className="ref-heading-kicker">MEET THE MIKRAS TEAM</p><h2>Small team.<br /><em>Serious momentum.</em></h2></div>
        <p>Move through the team from right to left. Tap any profile to open the member story.</p>
      </div>
      <div className="ref-team-window"><div className="ref-team-track">{movingMembers.map((member, index) => <MemberCard member={member} index={index} key={`${member.id}-${index}`} />)}</div></div>
    </section>

    <section id="packages" className="ref-white-section ref-packages">
      <div className="ref-statement-heading ref-statement-centered">
        <p className="ref-heading-kicker">INVESTMENT PACKAGES</p>
        <h2>Choose your next<br /><em>growth move.</em></h2>
        <p>Transparent starting points. Every plan can be updated from the admin panel as MIKRAS evolves.</p>
      </div>
      <p className="ref-section-note ref-interaction-note">Touch or hover a package to animate and reveal its colour.</p>
      <div className="ref-package-grid">{data.packages.map((item) => {
        const active = activePackage === item.id;
        return <article key={item.id} tabIndex={0} onClick={() => setActivePackage(item.id)} onFocus={() => setActivePackage(item.id)} className={`ref-package-card ${active ? "active" : ""}`}>
          {item.featured && <span className="popular-ribbon">MOST POPULAR</span>}
          <div className="ref-package-head"><span>{item.label}</span><h3>{item.name}</h3></div>
          <div className="ref-price"><small>LKR</small><strong>{item.price.toLocaleString()}</strong><span>{item.priceNote}</span></div>
          <ul>{item.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          <a href="#contact">Get Started Today</a>
        </article>;
      })}</div>
    </section>

    <section id="contact" className="ref-white-section ref-contact">
      <div className="ref-statement-heading ref-statement-contact">
        <p className="ref-heading-kicker">LET&apos;S TALK BUSINESS</p>
        <h2>Let&apos;s make your brand<br /><em>impossible</em> to ignore.</h2>
        <p>Tell us where you want to go. We&apos;ll map the smartest way to get there.</p>
      </div>
      <div className="ref-contact-panel"><div className="ref-contact-list">
        <a href={`tel:${settings.phone.replace(/\s/g, "")}`}><Phone /><span>{settings.phone}</span></a>
        <a href={`mailto:${settings.email}`}><Mail /><span>{settings.email}</span></a>
        <div><MapPin /><span>{settings.address}</span></div><div><Clock /><span>Mon - Fri : 9.00 AM - 6.00 PM</span></div>
      </div><form className="ref-contact-form" onSubmit={submitContact} aria-busy={contactState.type==="sending"}>
        <input name="name" placeholder="Your Name" autoComplete="name" minLength={2} maxLength={80} required /><input name="email" type="email" placeholder="Your Email" autoComplete="email" maxLength={254} required />
        <input name="phone" placeholder="Your Phone" autoComplete="tel" inputMode="tel" maxLength={30} /><input name="subject" placeholder="Subject" minLength={2} maxLength={120} required />
        <textarea name="message" placeholder="Your Message" rows={4} minLength={10} maxLength={2000} required />
        <label className="ref-contact-consent"><input name="consent" type="checkbox" required /><span>I agree that MIKRAS may contact me about this enquiry.</span></label>
        <label className="ref-honeypot" aria-hidden="true">Company website<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label>
        {contactState.message && <p className={`ref-contact-status ${contactState.type}`} role={contactState.type==="error"?"alert":"status"}>{contactState.message}</p>}
        <button type="submit" disabled={contactState.type==="sending"}>{contactState.type==="sending"?"Sending...":"Send Message"} <Send size={15} /></button>
      </form></div>
    </section>

    {whatsappNumber&&<a className="ref-whatsapp" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(settings.whatsappMessage)}`} target="_blank" rel="noreferrer" aria-label="Chat with MIKRAS on WhatsApp"><MessageCircle/><span>WhatsApp us</span></a>}
    <footer className="ref-footer"><div><BrandMark /><p>We help brands grow beyond limits with innovative marketing strategies, creative content and data-driven results.</p><div className="ref-socials">{settings.instagram && <a href={settings.instagram} aria-label="Instagram"><Camera /></a>}{settings.linkedin && <a href={settings.linkedin} aria-label="LinkedIn"><BriefcaseBusiness /></a>}<a href={`mailto:${settings.email}`} aria-label="Email"><Mail /></a></div></div><div><strong>Quick Links</strong><a href="#top">Home</a><a href="#services">Services</a><a href="#packages">Packages</a><a href="#team">Team</a><a href="#contact">Contact</a></div><div><strong>Services</strong>{services.slice(0, 5).map(service => <a href="#services" key={service.title}>{service.title}</a>)}</div><div><strong>Contact</strong><span>{settings.phone}</span><span>{settings.email}</span><span>{settings.address}</span></div><small>© {new Date().getFullYear()} {settings.companyName}. All Rights Reserved.</small></footer>
  </main>;
}
