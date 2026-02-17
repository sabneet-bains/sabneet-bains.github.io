(function attachArchiveController() {
  const root = document.querySelector(".archive-page");
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll(".archive-filter"));
  const items = Array.from(root.querySelectorAll(".archive-item"));
  const groups = Array.from(root.querySelectorAll(".archive-group"));
  const status = root.querySelector(".archive-filters__status");
  const searchInput = root.querySelector("#archive-search");
  const sortSelect = root.querySelector("#archive-sort");
  const toggleRepro = root.querySelector("#toggle-repro");
  const toggleApplied = root.querySelector("#toggle-applied");
  const toggleRepo = root.querySelector("#toggle-repo");
  const metrics = {
    entries: root.querySelector('[data-metric="entries"]'),
    code: root.querySelector('[data-metric="code"]'),
    report: root.querySelector('[data-metric="report"]'),
    seeded: root.querySelector('[data-metric="seeded"]'),
  };
  const comparePanel = document.querySelector("#archive-compare");
  const compareList = document.querySelector("#compare-list");
  const compareClear = document.querySelector("#compare-clear");

  if (
    !buttons.length ||
    !items.length ||
    !groups.length ||
    !searchInput ||
    !sortSelect ||
    !toggleRepro ||
    !toggleApplied ||
    !toggleRepo ||
    !metrics.entries ||
    !metrics.code ||
    !metrics.report ||
    !metrics.seeded ||
    !comparePanel ||
    !compareList ||
    !compareClear
  ) {
    return;
  }

  const TAXONOMY = {
    ai: ["ai", "ml", "vision", "computer-vision", "perception"],
    simulation: ["simulation", "modeling", "dynamics", "stochastic"],
    quantum: ["quantum", "qft", "cirq"],
    systems: ["systems", "performance", "engineering", "defense"],
    neuroscience: ["neuroscience", "neuroimaging", "spiking"],
  };

  const STORAGE_KEY = "archiveAnalyticsV1";

  const state = {
    filter: "all",
    filterLabel: "All",
    query: "",
    sort: "recent",
    highRepro: false,
    appliedOnly: false,
    hasRepoOnly: false,
    compare: new Set(),
    activeIndex: -1,
  };

  const normalizeTag = (tag) => tag.toLowerCase().trim().replace(/\s+/g, "-");

  const normalizeTagsForItem = (rawTags) => {
    const input = rawTags
      .split(/\s+/)
      .map(normalizeTag)
      .filter(Boolean);
    const normalized = new Set(input);

    Object.entries(TAXONOMY).forEach(([canonical, aliases]) => {
      if (aliases.some((alias) => normalized.has(normalizeTag(alias)))) {
        normalized.add(canonical);
      }
    });

    return normalized;
  };

  const track = (eventName) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const store = raw ? JSON.parse(raw) : { events: {} };
      store.events[eventName] = (store.events[eventName] || 0) + 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (_) {
      // no-op for private mode or blocked storage
    }
  };

  const getReproMap = (item) => {
    const tags = Array.from(item.querySelectorAll(".archive-item__repro-tags li"));
    const has = (label) => tags.some((el) => el.textContent.trim().toLowerCase() === label && el.classList.contains("is-on"));
    return {
      code: has("code"),
      data: has("data"),
      environment: has("environment"),
      seeded: has("seeded runs"),
      report: has("report"),
    };
  };

  const injectAvailabilityBadge = (item) => {
    if (item.querySelector(".archive-item__availability")) return;
    const availability = (item.dataset.availability || "public").toLowerCase();
    const labelMap = { public: "Public", partial: "Partially Public", restricted: "Restricted" };
    const badge = document.createElement("p");
    badge.className = `archive-item__availability archive-item__availability--${availability}`;
    badge.textContent = labelMap[availability] || "Public";
    const title = item.querySelector(".archive-item__title");
    if (title) title.insertAdjacentElement("beforebegin", badge);
  };

  const copyText = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  };

  const getInsightLine = (item, prefix) => {
    const line = Array.from(item.querySelectorAll(".archive-item__insight")).find((p) => p.textContent.trim().startsWith(prefix));
    return line ? line.textContent.replace(`${prefix} `, "").trim() : "";
  };

  const getKeyResultText = (item) => {
    const keyResult = item.querySelector(".archive-item__key-result");
    if (!keyResult) return "";
    const text = keyResult.textContent.trim();
    return text.replace(/^Key Result:\s*/i, "");
  };

  const injectActions = (item) => {
    if (item.querySelector(".archive-item__actions")) return;
    const actions = document.createElement("div");
    actions.className = "archive-item__actions";
    const id = item.id;
    const title = item.querySelector(".archive-item__title")?.textContent.trim() || "Archive Entry";
    const meta = item.querySelector(".archive-item__meta")?.textContent.trim() || "";
    const summary = item.querySelector(".archive-item__summary")?.textContent.trim() || "";
    const link = `${window.location.origin}${window.location.pathname}#${id}`;
    const citation = `${title}. ${meta}. Sabneet Bains Research Archive. ${link}`;

    const makeButton = (label, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "archive-item__action";
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    };

    const compareBtn = makeButton("Compare", () => {
      if (state.compare.has(id)) {
        state.compare.delete(id);
      } else if (state.compare.size < 3) {
        state.compare.add(id);
      }
      renderCompare();
      track("compare_toggle");
    });

    const copyLinkBtn = makeButton("Copy Link", async () => {
      await copyText(link);
      track("copy_link");
    });

    const copySummaryBtn = makeButton("Copy Summary", async () => {
      await copyText(summary);
      track("copy_summary");
    });

    const copyCitationBtn = makeButton("Copy Citation", async () => {
      await copyText(citation);
      track("copy_citation");
    });

    const moreMenu = document.createElement("details");
    moreMenu.className = "archive-item__more";

    const moreSummary = document.createElement("summary");
    moreSummary.className = "archive-item__more-summary";
    moreSummary.textContent = "More";

    const moreList = document.createElement("div");
    moreList.className = "archive-item__more-list";
    moreList.append(copyLinkBtn, copySummaryBtn, copyCitationBtn);

    moreMenu.append(moreSummary, moreList);

    actions.append(compareBtn, moreMenu);
    const fold = item.querySelector(".archive-item__fold");
    if (fold) {
      item.insertBefore(actions, fold);
    } else {
      item.append(actions);
    }
  };

  const buildProgressiveDisclosure = (item) => {
    if (item.querySelector(".archive-item__fold")) return;

    const summary = item.querySelector(".archive-item__summary");
    const insights = item.querySelector(".archive-item__insights");
    const details = item.querySelector(".archive-item__details");
    const repro = item.querySelector(".archive-item__repro");
    const links = item.querySelector(".archive-item__links");

    let keyInsight = null;
    const remainingInsights = [];
    if (insights) {
      Array.from(insights.querySelectorAll(".archive-item__insight")).forEach((line) => {
        const text = line.textContent.trim();
        if (!keyInsight && text.startsWith("Key Result:")) {
          keyInsight = text.replace("Key Result:", "").trim();
        } else {
          remainingInsights.push(line);
        }
      });
      // Original insight container must be removed so extracted key result is not duplicated.
      insights.remove();
    }

    if (keyInsight) {
      const keyResult = document.createElement("p");
      keyResult.className = "archive-item__key-result";
      keyResult.innerHTML = `<strong>Key Result:</strong> ${keyInsight}`;
      const title = item.querySelector(".archive-item__title");
      if (title) title.insertAdjacentElement("afterend", keyResult);
    }

    const fold = document.createElement("div");
    fold.className = "archive-item__fold";
    fold.hidden = true;
    fold.id = `${item.id}-details`;

    if (summary) fold.append(summary);
    if (remainingInsights.length) {
      const ext = document.createElement("div");
      ext.className = "archive-item__insights";
      remainingInsights.forEach((line) => ext.append(line));
      fold.append(ext);
    }
    if (details) fold.append(details);
    if (repro) fold.append(repro);
    if (links && links.querySelector("a")) fold.append(links);
    else if (links) links.remove();

    item.append(fold);
  };

  const addExpandToggle = (item) => {
    const actions = item.querySelector(".archive-item__actions");
    const fold = item.querySelector(".archive-item__fold");
    if (!actions || !fold || actions.querySelector(".archive-item__toggle")) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "archive-item__toggle";
    toggle.textContent = "Expand details";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", fold.id);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.textContent = expanded ? "Expand details" : "Collapse details";
      fold.hidden = expanded;
      item.classList.toggle("is-expanded", !expanded);
      track("toggle_details");
    });

    actions.insertAdjacentElement("afterbegin", toggle);
  };

  const initializeItems = () => {
    items.forEach((item) => {
      item.dataset.tagsNormalized = Array.from(normalizeTagsForItem(item.dataset.tags || "")).join(" ");
      item.tabIndex = -1;
      const repro = getReproMap(item);
      item.dataset.hasCode = String(repro.code);
      item.dataset.hasReport = String(repro.report);
      item.dataset.hasSeeded = String(repro.seeded);
      item.dataset.hasRepo = String(!!item.querySelector('.archive-item__links a[href*="github.com"]'));
      injectAvailabilityBadge(item);
      buildProgressiveDisclosure(item);
      injectActions(item);
      addExpandToggle(item);
    });
  };

  const getVisibleItems = () => items.filter((item) => !item.classList.contains("is-hidden"));

  const updateGroupVisibility = () => {
    groups.forEach((group) => {
      const visibleCount = group.querySelectorAll(".archive-item:not(.is-hidden)").length;
      group.classList.toggle("is-hidden", visibleCount === 0);
    });
  };

  const matchesFilter = (item) => {
    if (state.filter === "all") return true;
    const tags = (item.dataset.tagsNormalized || "").split(/\s+/).filter(Boolean);
    return tags.includes(state.filter);
  };

  const matchesSearch = (item) => {
    if (!state.query) return true;
    return item.textContent.toLowerCase().includes(state.query);
  };

  const matchesToggles = (item) => {
    if (state.highRepro && Number(item.dataset.repro || 0) < 4) return false;
    if (state.appliedOnly && Number(item.dataset.applied || 0) < 4) return false;
    if (state.hasRepoOnly && item.dataset.hasRepo !== "true") return false;
    return true;
  };

  const sortItemsWithinGroups = () => {
    const rank = (item, key) => Number(item.dataset[key] || 0);
    groups.forEach((group) => {
      const list = group.querySelector(".archive-list");
      if (!list) return;
      const listItems = Array.from(list.querySelectorAll(".archive-item"));
      listItems.sort((a, b) => {
        if (state.sort === "recent") return rank(b, "year") - rank(a, "year");
        if (state.sort === "repro") return rank(b, "repro") - rank(a, "repro");
        if (state.sort === "applied") return rank(b, "applied") - rank(a, "applied");
        if (state.sort === "theoretical") return rank(b, "theoretical") - rank(a, "theoretical");
        return 0;
      });
      listItems.forEach((item) => list.appendChild(item));
    });
  };

  const updateMetrics = () => {
    const visible = getVisibleItems();
    const count = visible.length;
    const pct = (v) => (count ? `${Math.round((v / count) * 100)}%` : "0%");
    const code = visible.filter((item) => item.dataset.hasCode === "true").length;
    const report = visible.filter((item) => item.dataset.hasReport === "true").length;
    const seeded = visible.filter((item) => item.dataset.hasSeeded === "true").length;

    metrics.entries.textContent = String(count);
    metrics.code.textContent = pct(code);
    metrics.report.textContent = pct(report);
    metrics.seeded.textContent = pct(seeded);
  };

  const updateStatus = () => {
    if (!status) return;
    const visible = getVisibleItems().length;
    const total = items.length;
    const parts = [`Showing ${visible} of ${total}`];
    if (state.filter !== "all") parts.push(`Filter: ${state.filterLabel}`);
    if (state.query) parts.push(`Search: "${state.query}"`);
    if (state.highRepro) parts.push("High Reproducibility");
    if (state.appliedOnly) parts.push("Applied Work");
    if (state.hasRepoOnly) parts.push("Has Repository");
    const selectedSort = sortSelect.options[sortSelect.selectedIndex]?.textContent?.trim();
    if (selectedSort) parts.push(`Sort: ${selectedSort}`);
    status.textContent = parts.join(" · ");
  };

  const syncUrlState = () => {
    const params = new URLSearchParams();
    if (state.filter !== "all") params.set("filter", state.filter);
    if (state.query) params.set("q", state.query);
    if (state.sort !== "recent") params.set("sort", state.sort);
    if (state.highRepro) params.set("repro", "1");
    if (state.appliedOnly) params.set("applied", "1");
    if (state.hasRepoOnly) params.set("repo", "1");
    const q = params.toString();
    history.replaceState(null, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
  };

  const setActiveButton = (activeButton) => {
    buttons.forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const applyState = () => {
    sortItemsWithinGroups();
    items.forEach((item) => {
      const show = matchesFilter(item) && matchesSearch(item) && matchesToggles(item);
      item.classList.toggle("is-hidden", !show);
    });
    updateGroupVisibility();
    updateMetrics();
    updateStatus();
    syncUrlState();
  };

  const readUrlState = () => {
    const params = new URLSearchParams(window.location.search);
    const filter = (params.get("filter") || "all").toLowerCase();
    const filterButton = buttons.find((b) => (b.dataset.filter || "all").toLowerCase() === filter);
    if (filterButton) {
      state.filter = filter;
      state.filterLabel = filterButton.textContent.trim();
      setActiveButton(filterButton);
    }

    const query = params.get("q");
    if (query) {
      state.query = query.toLowerCase();
      searchInput.value = query;
    }

    const sort = params.get("sort");
    if (sort && Array.from(sortSelect.options).some((opt) => opt.value === sort)) {
      state.sort = sort;
      sortSelect.value = sort;
    }

    state.highRepro = params.get("repro") === "1";
    state.appliedOnly = params.get("applied") === "1";
    state.hasRepoOnly = params.get("repo") === "1";
    toggleRepro.checked = state.highRepro;
    toggleApplied.checked = state.appliedOnly;
    toggleRepo.checked = state.hasRepoOnly;
  };

  const renderCompare = () => {
    const selected = Array.from(state.compare).map((id) => document.getElementById(id)).filter(Boolean);
    if (!selected.length) {
      comparePanel.hidden = true;
      compareList.innerHTML = "";
      return;
    }

    comparePanel.hidden = false;
    compareList.innerHTML = "";

    selected.forEach((item) => {
      const card = document.createElement("article");
      card.className = "archive-compare__item";
      const title = item.querySelector(".archive-item__title")?.textContent.trim() || "Entry";
      const keyResult =
        getKeyResultText(item) ||
        getInsightLine(item, "Key Result:") ||
        item.querySelector(".archive-item__summary")?.textContent.trim() ||
        "";

      const h = document.createElement("h3");
      h.className = "archive-compare__item-title";
      h.textContent = title;
      const p = document.createElement("p");
      p.className = "archive-compare__item-text";
      p.textContent = keyResult;
      card.append(h, p);
      compareList.append(card);
    });
  };

  const focusVisibleItem = (step) => {
    const visible = getVisibleItems();
    if (!visible.length) return;
    if (state.activeIndex < 0 || state.activeIndex >= visible.length) state.activeIndex = 0;
    else state.activeIndex = (state.activeIndex + step + visible.length) % visible.length;
    const target = visible[state.activeIndex];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const bindEvents = () => {
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = (button.dataset.filter || "all").toLowerCase();
        state.filterLabel = (button.textContent || state.filter).trim();
        setActiveButton(button);
        applyState();
        track("filter_change");
      });
    });

    searchInput.addEventListener("input", () => {
      state.query = searchInput.value.trim().toLowerCase();
      applyState();
      track("search_input");
    });

    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value || "recent";
      applyState();
      track("sort_change");
    });

    toggleRepro.addEventListener("change", () => {
      state.highRepro = toggleRepro.checked;
      applyState();
      track("toggle_repro");
    });

    toggleApplied.addEventListener("change", () => {
      state.appliedOnly = toggleApplied.checked;
      applyState();
      track("toggle_applied");
    });

    toggleRepo.addEventListener("change", () => {
      state.hasRepoOnly = toggleRepo.checked;
      applyState();
      track("toggle_repo");
    });

    compareClear.addEventListener("click", () => {
      state.compare.clear();
      renderCompare();
      track("compare_clear");
    });

    root.addEventListener("focusin", (event) => {
      const item = event.target.closest(".archive-item");
      if (!item) return;
      const visible = getVisibleItems();
      state.activeIndex = visible.indexOf(item);
    });

    document.addEventListener("keydown", (event) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const inInput = tag === "input" || tag === "textarea" || tag === "select";
      if (event.key === "/" && !inInput) {
        event.preventDefault();
        searchInput.focus();
        return;
      }
      if (event.key === "Escape") {
        if (inInput) {
          searchInput.value = "";
          state.query = "";
          applyState();
        }
        return;
      }
      if (inInput) return;
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        focusVisibleItem(1);
      } else if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusVisibleItem(-1);
      }
    });

    document.addEventListener("click", (event) => {
      const withinMoreMenu = event.target.closest(".archive-item__more");
      if (withinMoreMenu) return;
      root.querySelectorAll(".archive-item__more[open]").forEach((menu) => {
        menu.open = false;
      });
    });
  };

  initializeItems();
  readUrlState();
  bindEvents();
  renderCompare();
  applyState();
})();
