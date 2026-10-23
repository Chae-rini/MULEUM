"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "./icon";

interface NavigationItem<T extends string> {
  page: T;
  label: string;
  icon: string;
  href: string;
}

function Brand({ href }: { href: string }) {
  return (
    <Link className="logo" href={href} aria-label="물음 홈">
      <Image className="brand-mark" src="/brand/muleum-icon-blue.png" alt="" width={56} height={56} sizes="56px" />
      <span>
        <strong>물음<span className="brand-english">MULEUM</span></strong>
        <small>모든 배움은 하나의 질문에서</small>
      </span>
    </Link>
  );
}

export function Navigation<T extends string>({ links, current, brandHref = "/", children }: {
  links: NavigationItem<T>[];
  current: T;
  brandHref?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function closeMenu() {
    dialog.current?.close();
    setOpen(false);
  }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 691px)");
    const handleResize = () => {
      if (desktop.matches) {
        dialog.current?.close();
        setOpen(false);
      }
    };
    desktop.addEventListener("change", handleResize);
    return () => desktop.removeEventListener("change", handleResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function menuItems() {
    return links.map((item) => (
      <Link
        key={item.page}
        href={item.href}
        onClick={closeMenu}
        aria-current={current === item.page ? "page" : undefined}
        data-section={item.page}
      >
        <Icon className="nav-icon" name={item.icon} />
        {item.label}
      </Link>
    ));
  }

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="header-brand">
          <button
            type="button"
            className="menu-toggle"
            aria-label="메뉴 열기"
            aria-haspopup="dialog"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => { dialog.current?.showModal(); setOpen(true); }}
          >
            <Icon name="menu" />
          </button>
          <Brand href={brandHref} />
        </div>
        {children}
      </div>
      <nav className="desktop-nav" aria-label="메인 메뉴">{menuItems()}</nav>
      <dialog
        ref={dialog}
        id="mobile-menu"
        className="mobile-drawer"
        aria-labelledby="mobile-menu-title"
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          // A modal backdrop click targets the dialog but lies outside its bounds.
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
        }}
      >
        <div className="drawer-header">
          <h2 id="mobile-menu-title">물음 메뉴</h2>
          <button type="button" className="menu-close" aria-label="메뉴 닫기" onClick={closeMenu} autoFocus><Icon name="x" /></button>
        </div>
        <p className="nav-caption">MY LEARNING SPACE</p>
        <nav className="drawer-nav" aria-label="모바일 메뉴">{menuItems()}</nav>
        <div className="aside-tip">
          <span className="small">A LITTLE QUESTION</span>
          <strong>오늘의 작은 물음</strong>
          <p>나는 무엇을 모르는가?<br />그것을 어떻게 알아낼까?</p>
          <span aria-hidden="true" className="tip-mark">?</span>
        </div>
        <p className="small drawer-footer">물음 v0.1 · 로컬 데모</p>
      </dialog>
    </header>
  );
}
