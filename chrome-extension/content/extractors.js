// Extracts job details from the current page.
// Tries, in order: Oracle API → JSON-LD/meta/DOM → short retry for slow SPAs.

const JobExtractors = {
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

  // A page counts as a job if these three required fields are present.
  isValidJob(data) {
    return Boolean(data?.companyName && data?.jobTitle && data?.location);
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

    const data = {
      companyName:
        companyFromJson ||
        this.companyFromMeta() ||
        this.queryText([".company-name", "[data-automation-id='companyName']", "[itemprop='name']"]),
      jobTitle:
        posting?.title ||
        this.meta("og:title") ||
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

    const immediate = this.extractFromPage();
    if (immediate) return immediate;

    return this.retryExtract(8, 500);
  },
};
