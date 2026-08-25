import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.12.0/+esm";

const documentRoot = document.querySelector("#document");
const tocRoot = document.querySelector("#toc");
const themeToggle = document.querySelector("#theme-toggle");
const backToTop = document.querySelector("#back-to-top");

function slugify(text, index) {
  const slug = text.trim().toLowerCase()
    .replace(/[\s：:、，。/]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]/gu, "")
    .replace(/^-+|-+$/g, "");
  return slug || `section-${index}`;
}

function prepareDocument() {
  documentRoot.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.before(wrap);
    wrap.append(table);
  });

  const headings = [...documentRoot.querySelectorAll("h2, h3")];
  headings.forEach((heading, index) => {
    heading.id = slugify(heading.textContent, index);
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    if (heading.tagName === "H3") link.className = "sub";
    tocRoot.append(link);
  });

  documentRoot.querySelectorAll("pre").forEach((pre) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.textContent = "复制";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(pre.querySelector("code")?.textContent || pre.textContent);
      button.textContent = "已复制";
      window.setTimeout(() => { button.textContent = "复制"; }, 1200);
    });
    pre.append(button);
  });
}

async function renderDiagrams() {
  const codeBlocks = [...documentRoot.querySelectorAll("pre > code.language-mermaid")];
  let failures = 0;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif",
    themeVariables: {
      primaryColor: "#eceaff",
      primaryTextColor: "#172033",
      primaryBorderColor: "#5b4fe8",
      lineColor: "#657086",
      secondaryColor: "#eef7f4",
      tertiaryColor: "#fff7e6"
    }
  });

  for (const [index, code] of codeBlocks.entries()) {
    const source = code.textContent.trim();
    const card = document.createElement("div");
    card.className = "diagram-card";
    card.dataset.diagram = String(index + 1);
    const status = document.createElement("span");
    status.className = "diagram-status";
    card.append(status);
    code.parentElement.replaceWith(card);

    try {
      const { svg, bindFunctions } = await mermaid.render(`diagram-${index + 1}`, source);
      card.insertAdjacentHTML("beforeend", svg);
      bindFunctions?.(card);
      status.textContent = `图 ${index + 1}`;
    } catch (error) {
      failures += 1;
      card.classList.add("diagram-error");
      status.textContent = `图 ${index + 1} · 渲染失败`;
      card.append(document.createTextNode(error?.message || String(error)));
      document.querySelector(`#ddiagram-${index + 1}`)?.remove();
    }
  }

  document.documentElement.dataset.diagramCount = String(codeBlocks.length);
  document.documentElement.dataset.diagramFailures = String(failures);
}

function installPageBehavior() {
  const preferred = localStorage.getItem("theme");
  if (preferred) document.documentElement.dataset.theme = preferred;

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => backToTop.classList.toggle("visible", window.scrollY > 600), { passive: true });

  const links = [...tocRoot.querySelectorAll("a")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
    }
  }, { rootMargin: "-20% 0px -70%" });
  documentRoot.querySelectorAll("h2, h3").forEach((heading) => observer.observe(heading));
}

async function init() {
  try {
    if (!window.marked) throw new Error("Markdown 渲染库加载失败");
    const response = await fetch("./Mermaid语法表.md");
    if (!response.ok) throw new Error(`文档读取失败（HTTP ${response.status}）`);
    documentRoot.innerHTML = window.marked.parse(await response.text(), { gfm: true });
    prepareDocument();
    await renderDiagrams();
    installPageBehavior();
  } catch (error) {
    documentRoot.innerHTML = `<p class="fatal-error">${error?.message || String(error)}</p>`;
  }
}

init();
