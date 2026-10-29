(() => {
  const dialog = document.querySelector("#source-dialog");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogDescription = document.querySelector("#dialog-description");
  const dialogContent = document.querySelector("#dialog-content");
  let dialogTrigger;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function originalLink(board) {
    const link = element("a", "text-link", "Åpne originalfoto ↗");
    link.href = board.original;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `Åpne originalfoto: ${board.title} (ny fane)`);
    return link;
  }

  function appendNotes(parent, notes) {
    const list = element("ul", "transcript-list");
    for (const note of notes) {
      const item = element("li", `transcript-note${note.caution ? " uncertain" : ""}`);
      item.append(element("p", "", note.text));
      if (note.caution) {
        item.append(element("span", "uncertainty-label", "Usikker / delvis avskrift"));
        item.append(element("p", "uncertainty-explanation", note.caution));
      }
      list.append(item);
    }
    parent.append(list);
  }

  function openSource(trigger) {
    dialogTrigger = trigger;
    const boardKey = trigger.dataset.board;
    const themeKey = trigger.dataset.theme;
    dialogContent.replaceChildren();
    if (boardKey) {
      const board = retroData.boards[boardKey];
      dialogTitle.textContent = board.title;
      dialogDescription.textContent = board.description;
      const layout = element("div", "source-reader");
      const photo = element("div", "reader-photo");
      const imageLink = element("a", "reader-image-link");
      imageLink.href = board.image;
      imageLink.target = "_blank";
      imageLink.rel = "noopener";
      imageLink.setAttribute("aria-label", `Se større, leseriktig foto: ${board.title} (ny fane)`);
      const image = element("img");
      image.src = board.image;
      image.alt = `Foto av ${board.label.toLowerCase()}. Åpne i ny fane for å forstørre.`;
      image.width = 1950;
      image.height = 2600;
      imageLink.append(image);
      photo.append(imageLink, element("p", "photo-hint", "Trykk på bildet for å forstørre i ny fane."), originalLink(board));
      const transcript = element("div", "reader-transcript");
      transcript.append(element("h3", "", "Avleste innspill"));
      appendNotes(transcript, retroData.notes.filter((note) => note.board === boardKey));
      layout.append(photo, transcript);
      dialogContent.append(layout);
    } else if (themeKey) {
      dialogTitle.textContent = retroData.themes[themeKey];
      dialogDescription.textContent = "Disse innspillene er samlet under temaet. Koblingen og rolleforslaget er en sammenfatning; lappene er ikke en ferdig beslutning.";
      for (const [key, board] of Object.entries(retroData.boards)) {
        const notes = retroData.notes.filter((note) => note.board === key && note.themes.includes(themeKey));
        if (!notes.length) continue;
        const section = element("section", `theme-source theme-${key}`);
        const heading = element("div", "theme-source-heading");
        heading.append(element("h3", "", board.title), originalLink(board));
        section.append(heading);
        appendNotes(section, notes);
        dialogContent.append(section);
      }
    }
    dialog.showModal();
    document.body.classList.add("dialog-open");
    dialog.scrollTop = 0;
    document.querySelector("#close-dialog").focus();
  }

  document.querySelectorAll("[data-board], [data-theme]").forEach((trigger) => {
    trigger.addEventListener("click", () => openSource(trigger));
  });
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    dialogTrigger?.focus({ preventScroll: true });
  });

  const filters = [...document.querySelectorAll("[data-filter]")];
  const cards = [...document.querySelectorAll(".role-card")];
  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      filters.forEach((button) => {
        const selected = button === filter;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      let visibleCount = 0;
      cards.forEach((card) => {
        card.hidden = filter.dataset.filter !== "all" && card.dataset.category !== filter.dataset.filter;
        if (!card.hidden) {
          visibleCount++;
          card.classList.add("is-visible");
        }
      });
      document.querySelector("#filter-status").textContent = `Viser ${visibleCount} av ${cards.length} temaer.`;
    });
  });

  const storageKey = "retro-role-preparation-v1";
  const checkboxes = [...document.querySelectorAll("[data-step]")];
  let savedSteps = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) savedSteps = saved.filter((value) => typeof value === "string");
  } catch {
    document.querySelector("#storage-note").textContent = "Lagring er ikke tilgjengelig. Avkrysninger gjelder bare mens siden er åpen, og er ikke felles beslutninger.";
  }
  checkboxes.forEach((checkbox) => { checkbox.checked = savedSteps.includes(checkbox.dataset.step); });

  function updateProgress(persist = false) {
    const checked = checkboxes.filter((checkbox) => checkbox.checked);
    document.querySelector("#preparation-progress").value = checked.length;
    document.querySelector("#progress-text").textContent = `${checked.length} av ${checkboxes.length}`;
    document.querySelector("#reset-progress").disabled = checked.length === 0;
    checkboxes.forEach((checkbox) => checkbox.closest(".step").classList.toggle("prepared", checkbox.checked));
    if (persist) {
      document.querySelector("#progress-status").textContent = `${checked.length} av ${checkboxes.length} samtalepunkter markert som forberedt.`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(checked.map((checkbox) => checkbox.dataset.step)));
      } catch {
        document.querySelector("#storage-note").textContent = "Kunne ikke lagre. Avkrysninger gjelder bare mens siden er åpen, og er ikke felles beslutninger.";
      }
    }
  }
  updateProgress();
  checkboxes.forEach((checkbox) => checkbox.addEventListener("change", () => updateProgress(true)));
  document.querySelector("#reset-progress").addEventListener("click", () => {
    checkboxes.forEach((checkbox) => { checkbox.checked = false; });
    updateProgress(true);
  });

  document.querySelector("#print-page").addEventListener("click", () => window.print());
  let detailsBeforePrint = [];
  window.addEventListener("beforeprint", () => {
    detailsBeforePrint = [...document.querySelectorAll(".steps-list details")].map((details) => ({ details, open: details.open }));
    detailsBeforePrint.forEach(({ details }) => { details.open = true; });
  });
  window.addEventListener("afterprint", () => {
    detailsBeforePrint.forEach(({ details, open }) => { details.open = open; });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach((node) => {
      node.classList.add("will-reveal");
      revealObserver.observe(node);
    });
    reducedMotion.addEventListener("change", (event) => {
      if (event.matches) {
        document.querySelectorAll(".will-reveal").forEach((node) => node.classList.add("is-visible"));
        revealObserver.disconnect();
      }
    });
  }

  if ("IntersectionObserver" in window) {
    const navLinks = [...document.querySelectorAll("nav a")];
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        }
      });
    }, { rootMargin: "-15% 0px -65% 0px" });
    document.querySelectorAll("#laerdommer, #rollen, #neste-steg").forEach((section) => navObserver.observe(section));
  }
})();
