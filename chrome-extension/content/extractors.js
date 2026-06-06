// Extracts job details from the current page.
// Tries, in order: Oracle API → JSON-LD/meta/DOM → short retry for slow SPAs.
// Guarded so popup fallback injection does not redeclare after content script load.

var JobExtractors = globalThis.__jobsTrackerJobExtractors;
if (!JobExtractors) {
  JobExtractors = {
  // --- small helpers ---

  queryText(selectors) {
    for (const selector of selectors) {
      const text = document.querySelector(selector)?.textContent?.trim().replace(/\s+/g, " ");
      if (text) return text;
    }
    return "";
  },

  meta(name) {
    return document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content?.trim() || "";
  },

  platformName() {
    const host = location.hostname.replace(/^www\./, "").split(".");
    const name = host.length >= 2 ? host[host.length - 2] : host[0];
    return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  companyFromMeta() {
    const siteName = this.meta("og:site_name");
    if (!siteName) return "";
    return siteName.replace(/\s+(career site|careers?|jobs?)$/i, "").trim() || siteName;
  },

  companyFromJobsHost() {
    const match = location.hostname.match(/^jobs\.([^.]+)\./i);
    if (!match) return "";
    return match[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  parseOgTitle(ogTitle) {
    const appleMatch = ogTitle.match(/^(.+?)\s+-\s+Jobs\s+-\s+Careers at (.+)$/i);
    if (appleMatch) {
      return { jobTitle: appleMatch[1].trim(), companyName: appleMatch[2].trim() };
    }
    return { jobTitle: ogTitle, companyName: "" };
  },

  // A page counts as a job if these three required fields are present.
  isValidJob(data) {
    return Boolean(data?.companyName && data?.jobTitle && data?.location);
  },

  // --- Apple career sites (jobs.apple.com) ---

  getAppleContext() {
    if (location.hostname !== "jobs.apple.com") return null;

    const jobId = location.pathname.match(/\/details\/(\d+)/i)?.[1];
    if (!jobId) return null;

    return { jobId };
  },

  mapAppleJob(job) {
    const locations = (job.locations || job.localeLocation || [])
      .map((loc) => loc?.name || loc?.city || loc?.countryName)
      .filter(Boolean);

    return {
      companyName: "Apple",
      jobTitle: job.postingTitle || "",
      location: [...new Set(locations)].join(", "),
      salary: "",
      employmentType: job.jobType || job.commitment || "",
      applicationUrl: location.href,
      sourcePlatform: "Apple",
    };
  },

  extractFromAppleHydration() {
    const job = window.__staticRouterHydrationData?.loaderData?.jobDetails?.jobsData;
    if (!job) return null;

    const mapped = this.mapAppleJob(job);
    return this.isValidJob(mapped) ? mapped : null;
  },

  async fetchAppleJob(ctx) {
    const response = await fetch(`${location.origin}/api/v1/jobDetails/${ctx.jobId}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const job = (await response.json())?.res;
    if (!job) return null;

    return this.mapAppleJob(job);
  },

  async tryAppleApi() {
    const ctx = this.getAppleContext();
    if (!ctx) return null;

    const hydrated = this.extractFromAppleHydration();
    if (this.isValidJob(hydrated)) return hydrated;

    try {
      const job = await this.fetchAppleJob(ctx);
      return this.isValidJob(job) ? job : null;
    } catch {
      return null;
    }
  },

  // --- MokaHR career sites (e.g. hire-r1.mokahr.com, app.mokahr.com) ---

  getMokaContext() {
    if (!/\.mokahr\.com$/i.test(location.hostname)) return null;

    const jobId = location.hash.match(/\/job\/([0-9a-f-]+)/i)?.[1];
    if (!jobId) return null;

    const pathMatch = location.pathname.match(/\/(social|campus)-recruitment\/([^/]+)\/(\d+)/i);
    if (!pathMatch) return null;

    return {
      site: pathMatch[1].toLowerCase() === "campus" ? "campus" : "social",
      orgId: pathMatch[2],
      siteId: pathMatch[3],
      jobId,
    };
  },

  companyFromMokaOrg(orgId) {
    return orgId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  locationFromMokaJob(job) {
    for (const field of Object.values(job.customFields || {})) {
      if (/location/i.test(field?.name || "")) return field.value?.trim() || "";
    }
    return job.department?.name?.trim() || "";
  },

  salaryFromMokaJob(job) {
    for (const field of Object.values(job.customFields || {})) {
      if (/salary|compensation|pay/i.test(field?.name || "")) return field.value?.trim() || "";
    }
    return "";
  },

  mapMokaJob(job, ctx) {
    return {
      companyName: this.companyFromMokaOrg(ctx.orgId),
      jobTitle: job.title || "",
      location: this.locationFromMokaJob(job),
      salary: this.salaryFromMokaJob(job),
      employmentType: job.commitment || "",
      applicationUrl: location.href,
      sourcePlatform: "Mokahr",
    };
  },

  async fetchMokaJob(ctx) {
    const limit = 50;
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const response = await fetch(`${location.origin}/api/outer/ats-apply/website/jobs/v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ctx.orgId,
          siteId: ctx.siteId,
          limit,
          offset,
          needStat: offset === 0,
          site: ctx.site,
        }),
      });
      if (!response.ok) return null;

      const json = await response.json();
      if (json.code !== 0) return null;

      total = json.data?.jobStats?.total ?? total;
      const job = json.data?.jobs?.find((entry) => entry.id === ctx.jobId);
      if (job) return this.mapMokaJob(job, ctx);

      offset += limit;
      if (!json.data?.jobs?.length) break;
    }

    return null;
  },

  async tryMokaApi() {
    const ctx = this.getMokaContext();
    if (!ctx) return null;

    try {
      const job = await this.fetchMokaJob(ctx);
      return this.isValidJob(job) ? job : null;
    } catch {
      return null;
    }
  },

  // --- Oracle career sites (e.g. jobs.akamai.com) ---

  getOracleContext() {
    const base = document.querySelector("base[data-apibaseurl][data-sitenumber]");
    const jobId = location.pathname.match(/\/job\/(\d+)/i)?.[1];
    if (!base || !jobId) return null;

    return {
      apiBase: base.getAttribute("data-apibaseurl").replace(/\/$/, ""),
      siteNumber: base.getAttribute("data-sitenumber"),
      jobId,
    };
  },

  async tryOracleApi() {
    const ctx = this.getOracleContext();
    if (!ctx) return null;

    const url =
      `${ctx.apiBase}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails` +
      `?expand=all&onlyData=true&finder=ById;Id=${ctx.jobId},siteNumber=${ctx.siteNumber}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const item = (await response.json()).items?.[0];
    if (!item) return null;

    const locationParts = [item.WorkplaceType, item.PrimaryLocation].filter(Boolean);
    const city = item.workLocation?.[0];
    if (city) {
      locationParts.push([city.TownOrCity, city.Region2, city.Country].filter(Boolean).join(", "));
    }

    return {
      companyName: this.companyFromMeta() || this.platformName(),
      jobTitle: item.Title || this.meta("og:title"),
      location: [...new Set(locationParts)].join(" · "),
      salary: this.queryText([".salary", ".compensation", "[itemprop='baseSalary']"]),
      employmentType: item.WorkplaceType || item.RequisitionType || item.JobSchedule || "",
      applicationUrl: location.href,
      sourcePlatform: this.platformName(),
    };
  },

  // --- JSON-LD JobPosting schema ---

  getJsonLdPosting() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const posting = this.findPosting(JSON.parse(script.textContent));
        if (posting) return posting;
      } catch {
        // skip bad JSON
      }
    }
    return null;
  },

  findPosting(node) {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = this.findPosting(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof node !== "object") return null;

    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => String(t).toLowerCase().includes("jobposting"))) return node;

    if (node["@graph"]) return this.findPosting(node["@graph"]);
    return null;
  },

  locationFromPosting(posting) {
    if (!posting) return "";

    const loc = posting.jobLocation;
    if (!loc) return "";
    if (typeof loc === "string") return loc;

    const entry = Array.isArray(loc) ? loc[0] : loc;
    const address = entry?.address || entry;
    if (typeof address === "string") return address;

    return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
      .filter(Boolean)
      .join(", ");
  },

  // --- generic page scraping ---

  extractFromPage() {
    const posting = this.getJsonLdPosting();
    const org = posting?.hiringOrganization;
    const companyFromJson = typeof org === "string" ? org : org?.name || org?.legalName || "";
    const ogParsed = this.parseOgTitle(this.meta("og:title"));

    const data = {
      companyName:
        companyFromJson ||
        ogParsed.companyName ||
        this.companyFromMeta() ||
        this.companyFromJobsHost() ||
        this.queryText([".company-name", "[data-automation-id='companyName']", "[itemprop='name']"]),
      jobTitle:
        posting?.title ||
        ogParsed.jobTitle ||
        this.queryText(["h1", "h2.posting-headline", ".job-title", "[itemprop='title']"]),
      location:
        this.locationFromPosting(posting) ||
        this.queryText([".job-location", ".location", "[itemprop='jobLocation']", "[data-automation-id='location']"]),
      salary: this.queryText([".salary", ".compensation", ".pay-range", "[itemprop='baseSalary']"]),
      employmentType: posting?.employmentType || this.queryText([".employment-type", ".job-type"]),
      applicationUrl:
        posting?.url ||
        document.querySelector("a[href*='apply']")?.href ||
        location.href,
      sourcePlatform: this.platformName(),
    };

    // og:title on career home pages is not a job title
    if (/career site$/i.test(data.jobTitle)) data.jobTitle = "";

    return this.isValidJob(data) ? data : null;
  },

  // SPAs render job details after the URL changes — retry until content appears.
  async retryExtract(attempts, delayMs) {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, delayMs));

      try {
        const oracleJob = await this.tryOracleApi();
        if (this.isValidJob(oracleJob)) return oracleJob;
      } catch {
        // keep retrying
      }

      try {
        const mokaJob = await this.tryMokaApi();
        if (this.isValidJob(mokaJob)) return mokaJob;
      } catch {
        // keep retrying
      }

      try {
        const appleJob = await this.tryAppleApi();
        if (this.isValidJob(appleJob)) return appleJob;
      } catch {
        // keep retrying
      }

      const job = this.extractFromPage();
      if (job) return job;
    }
    return null;
  },

  // Main entry point.
  async extractAsync() {
    try {
      const oracleJob = await this.tryOracleApi();
      if (this.isValidJob(oracleJob)) return oracleJob;
    } catch {
      // fall through to DOM extraction
    }

    try {
      const mokaJob = await this.tryMokaApi();
      if (this.isValidJob(mokaJob)) return mokaJob;
    } catch {
      // fall through to DOM extraction
    }

    try {
      const appleJob = await this.tryAppleApi();
      if (this.isValidJob(appleJob)) return appleJob;
    } catch {
      // fall through to DOM extraction
    }

    const immediate = this.extractFromPage();
    if (immediate) return immediate;

    return this.retryExtract(8, 500);
  },
};
  globalThis.__jobsTrackerJobExtractors = JobExtractors;
}
