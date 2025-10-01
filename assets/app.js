// Minimal JS to:
// 1) Load JSON content and render sections
// 2) Handle theme toggle
// 3) Set current year in footer

(function () {
    // Utility: apply theme and persist preference
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  
    // Initialize theme on first load
    function initTheme() {
      const saved = localStorage.getItem("theme");
      if (saved) return applyTheme(saved);
      // Fallback to system preference if no saved theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light");
    }
  
    // Render hero section from JSON
    function renderHero(hero) {
      const el = document.getElementById("hero");
      if (!el || !hero) return;
      el.innerHTML = `
        <h1>${hero.title ?? "Hello, I'm Someone"}</h1>
        <p>${hero.subtitle ?? "This is a minimal GitHub Pages skeleton."}</p>
      `;
    }

    // Render experience list from JSON
    function renderExperience(experiences) {
      const el = document.getElementById("experience");
      if (!el) return;

      const items = Array.isArray(experiences) ? experiences : [];
      el.innerHTML = `
        <h1>${items.length ? "Experience" : "No Experience Yet"}</h1>
        <div class="grid">
          ${items.map(exp => `
            <article class="card">
              <h2>${exp.title || "Untitled Role"}</h2>
              <h4><strong>${exp.Institution || "Unknown Institution"}</strong></h4>
              <p>${exp.description || ""}</p>
            </article>
          `).join("")}
        </div>
      `;
    }

    // Render projects list from JSON
    function renderProjects(projects) {
      const el = document.getElementById("projects");
      if (!el) return;
  
      const items = Array.isArray(projects) ? projects : [];
      el.innerHTML = `
        <h1>${items.length ? "Projects" : "No Projects Yet"}</h1>
        <div class="grid">
          ${items.map(p => `
            <article class="card">
              <h3>${p.name ?? "Untitled Project"}</h3>
              <p>${p.description ?? ""}</p>
              ${p.url ? `<a href="${p.url}" target="_blank" rel="noreferrer">View</a>` : ""}
            </article>
          `).join("")}
        </div>
      `;
    }
  
    // Load JSON content (basic fetch; ensure /data/content.json exists)
    async function loadContent() {
      try {
        const res = await fetch("data/content.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);
        const data = await res.json();
        // Expect structure: { site: {...}, hero: {...}, projects: [...] }
        renderHero(data.hero);
        renderProjects(data.projects);
        renderExperience(data.experience);
        // Optionally update title if provided
        if (data.site && data.site.title) document.title = data.site.title;
      } catch (err) {
        // Fail gracefully with minimal fallback content
        console.error(err);
        renderHero({ title: "Welcome", subtitle: "Could not load content.json." });
        renderProjects([]);
      }
    }
  
    // Bind events after DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
      initTheme();
      loadContent();
  
      // Footer year
      const yearEl = document.getElementById("year");
      if (yearEl) yearEl.textContent = new Date().getFullYear();
  
      // Theme toggle button
      const toggleBtn = document.getElementById("themeToggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          const cur = document.documentElement.getAttribute("data-theme");
          applyTheme(cur === "dark" ? "light" : "dark");
        });
      }
    });
  })();
  