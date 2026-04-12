#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";

const USERNAME = "aaronlamz";
const README_PATH = "README.md";

// Tech → badge config mapping
const BADGE_MAP = {
  // Languages
  TypeScript: { logo: "typescript", color: "3178C6" },
  JavaScript: { logo: "javascript", color: "F7DF1E", logoColor: "black" },
  HTML: { logo: "html5", color: "E34F26" },
  CSS: { logo: "css3", color: "1572B6" },
  Shell: { logo: "gnubash", color: "4EAA25" },
  Python: { logo: "python", color: "3776AB" },
  Go: { logo: "go", color: "00ADD8" },
  Rust: { logo: "rust", color: "000000" },
  Swift: { logo: "swift", color: "F05138" },
  Kotlin: { logo: "kotlin", color: "7F52FF" },
  Java: { logo: "openjdk", color: "ED8B00" },

  // Frameworks
  React: { logo: "react", color: "61DAFB", logoColor: "black" },
  "Next.js": { logo: "nextdotjs", color: "000000" },
  "Vue.js": { logo: "vuedotjs", color: "4FC08D" },
  Nuxt: { logo: "nuxtdotjs", color: "00DC82" },
  "Node.js": { logo: "nodedotjs", color: "339933" },
  NestJS: { logo: "nestjs", color: "E0234E" },
  Express: { logo: "express", color: "000000" },

  // Build tools
  Vite: { logo: "vite", color: "646CFF" },
  Rspack: { logo: "rspack", color: "FF6B35" },
  Webpack: { logo: "webpack", color: "8DD6F9", logoColor: "black" },
  Rollup: { logo: "rollupdotjs", color: "EC4A3F" },
  esbuild: { logo: "esbuild", color: "FFCF00", logoColor: "black" },

  // Styling
  "Tailwind CSS": { logo: "tailwindcss", color: "06B6D4" },
  Sass: { logo: "sass", color: "CC6699" },

  // Testing
  Vitest: { logo: "vitest", color: "6E9F18" },
  Jest: { logo: "jest", color: "C21325" },
  Playwright: { logo: "playwright", color: "2EAD33" },
  Cypress: { logo: "cypress", color: "17202C" },

  // DevOps & Infra
  Docker: { logo: "docker", color: "2496ED" },
  "GitHub Actions": { logo: "githubactions", color: "2088FF" },

  // Databases
  PostgreSQL: { logo: "postgresql", color: "4169E1" },
  MySQL: { logo: "mysql", color: "4479A1" },
  SQLite: { logo: "sqlite", color: "003B57" },
  MongoDB: { logo: "mongodb", color: "47A248" },
  Redis: { logo: "redis", color: "DC382D" },
};

// Dependency name → tech name mapping
const DEP_MAP = {
  react: "React",
  next: "Next.js",
  vue: "Vue.js",
  nuxt: "Nuxt",
  "@nestjs/core": "NestJS",
  express: "Express",
  vite: "Vite",
  webpack: "Webpack",
  rspack: "Rspack",
  "@rspack/core": "Rspack",
  "@rsbuild/core": "Rspack",
  rollup: "Rollup",
  esbuild: "esbuild",
  tailwindcss: "Tailwind CSS",
  sass: "Sass",
  vitest: "Vitest",
  jest: "Jest",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  cypress: "Cypress",
  drizzle: "SQLite",
  "drizzle-orm": "SQLite",
  "better-sqlite3": "SQLite",
  pg: "PostgreSQL",
  mysql2: "MySQL",
  mongodb: "MongoDB",
  mongoose: "MongoDB",
  redis: "Redis",
  ioredis: "Redis",
};

// GitHub language → tech name mapping
const LANG_MAP = {
  TypeScript: "TypeScript",
  JavaScript: "JavaScript",
  HTML: "HTML",
  CSS: "CSS",
  Shell: "Shell",
  Python: "Python",
  Go: "Go",
  Rust: "Rust",
  Swift: "Swift",
  Kotlin: "Kotlin",
  Java: "Java",
};

async function fetchJSON(url) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function detectTechStack() {
  const techs = new Set();

  // 1. Fetch all repos and collect languages
  const repos = await fetchJSON(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner`
  );

  for (const repo of repos) {
    if (repo.fork) continue;
    if (repo.language && LANG_MAP[repo.language]) {
      techs.add(LANG_MAP[repo.language]);
    }
  }

  // 2. Check package.json in each non-fork repo for framework/tool deps
  for (const repo of repos) {
    if (repo.fork) continue;
    try {
      const pkg = await fetchJSON(
        `https://raw.githubusercontent.com/${USERNAME}/${repo.name}/${repo.default_branch}/package.json`
      );
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      for (const [dep, tech] of Object.entries(DEP_MAP)) {
        if (allDeps[dep]) techs.add(tech);
      }
    } catch {
      // No package.json, skip
    }
  }

  // 3. Check for Dockerfile / docker-compose
  for (const repo of repos) {
    if (repo.fork) continue;
    try {
      await fetchJSON(
        `https://api.github.com/repos/${USERNAME}/${repo.name}/contents/Dockerfile`
      );
      techs.add("Docker");
    } catch {}
    try {
      await fetchJSON(
        `https://api.github.com/repos/${USERNAME}/${repo.name}/contents/.github/workflows`
      );
      techs.add("GitHub Actions");
    } catch {}
  }

  // Always include Node.js if JS/TS projects exist
  if (techs.has("TypeScript") || techs.has("JavaScript")) {
    techs.add("Node.js");
  }

  return techs;
}

function generateBadge(name) {
  const cfg = BADGE_MAP[name];
  if (!cfg) return null;
  const logoColor = cfg.logoColor || "white";
  return `![${name}](https://img.shields.io/badge/-${encodeURIComponent(name)}-${cfg.color}?style=flat&logo=${cfg.logo}&logoColor=${logoColor})`;
}

// Ordered categories for consistent output
const CATEGORY_ORDER = [
  // Languages first
  "TypeScript", "JavaScript", "HTML", "CSS", "Python", "Go", "Rust", "Swift", "Kotlin", "Java", "Shell",
  // Frameworks
  "React", "Next.js", "Vue.js", "Nuxt", "Node.js", "NestJS", "Express",
  // Build tools
  "Vite", "Rspack", "Webpack", "Rollup", "esbuild",
  // Styling
  "Tailwind CSS", "Sass",
  // Testing
  "Vitest", "Jest", "Playwright", "Cypress",
  // Databases
  "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis",
  // DevOps
  "Docker", "GitHub Actions",
];

async function main() {
  console.log("Detecting tech stack...");
  const techs = await detectTechStack();
  console.log("Detected:", [...techs].join(", "));

  const badges = CATEGORY_ORDER.filter((t) => techs.has(t))
    .map(generateBadge)
    .filter(Boolean)
    .join("\n");

  const readme = readFileSync(README_PATH, "utf-8");
  const startTag = "<!-- TECH-STACK-START -->";
  const endTag = "<!-- TECH-STACK-END -->";

  if (!readme.includes(startTag) || !readme.includes(endTag)) {
    console.error("Missing TECH-STACK markers in README.md");
    process.exit(1);
  }

  const updated = readme.replace(
    new RegExp(`${startTag}[\\s\\S]*?${endTag}`),
    `${startTag}\n${badges}\n${endTag}`
  );

  writeFileSync(README_PATH, updated);
  console.log("README.md updated!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
