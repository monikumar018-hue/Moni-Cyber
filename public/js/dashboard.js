(() => {
  const $ = (selector) => document.querySelector(selector);

  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function load() {
    try {
      const connection = await request("/api/connection");
      if (!connection.connected) {
        $("#status").textContent = "Meta account not connected. Connect your account to load Pages.";
        return;
      }
      $("#status").textContent = `Connected to ${connection.page.name}`;
      const { pages } = await request("/api/pages");
      const select = $("#pages");
      select.replaceChildren();
      for (const page of pages) {
        const option = document.createElement("option");
        option.value = page.id;
        option.textContent = page.name;
        option.selected = page.id === connection.page.id;
        select.append(option);
      }
      $("#pages-section").hidden = false;
      $("#draft-section").hidden = false;
      await loadDrafts();
    } catch (error) { $("#status").textContent = error.message; }
  }

  async function loadDrafts() {
    const { drafts } = await request("/api/drafts");
    const list = $("#drafts");
    list.replaceChildren();
    for (const draft of drafts) {
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${draft.pageName}: ${draft.content} `;
      const button = document.createElement("button");
      button.textContent = "Delete";
      button.addEventListener("click", async () => {
        try { await request(`/api/drafts/${encodeURIComponent(draft.id)}`, { method: "DELETE" }); await loadDrafts(); } catch (error) { alert(error.message); }
      });
      item.append(text, button);
      list.append(item);
    }
  }

  $("#select-page").addEventListener("click", async () => {
    try {
      const data = await request("/api/pages/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId: $("#pages").value }) });
      $("#status").textContent = `Connected to ${data.page.name}`;
      $("#draft-section").hidden = false;
      await loadDrafts();
    } catch (error) { alert(error.message); }
  });

  $("#create-draft").addEventListener("click", async () => {
    try {
      await request("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: $("#content").value }) });
      $("#content").value = "";
      await loadDrafts();
    } catch (error) { alert(error.message); }
  });

  load();
})();
