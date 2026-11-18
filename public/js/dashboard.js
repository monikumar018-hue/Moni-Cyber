const state = {
  pages: [],
  selectedPage: null,
};

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

async function loadConnection() {
  const status = document.querySelector("#status");
  const pagesSection = document.querySelector("#pages-section");
  const draftSection = document.querySelector("#draft-section");

  try {
    const connection = await jsonRequest("/api/connection");

    if (!connection.connected) {
      status.textContent = "Meta account not connected.";
      return;
    }

    state.selectedPage = connection.page;
    status.textContent = `Connected to ${connection.page.name}`;

    const result = await jsonRequest("/api/pages");
    state.pages = result.pages || [];

    const pageSelect = document.querySelector("#pages");
    pageSelect.innerHTML = "";

    for (const page of state.pages) {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = page.name;
      option.selected = page.id === state.selectedPage.id;
      pageSelect.append(option);
    }

    pagesSection.hidden = false;
    draftSection.hidden = false;
    await loadDrafts();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function selectPage() {
  const pageId = document.querySelector("#pages").value;

  try {
    const result = await jsonRequest("/api/pages/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId }),
    });

    state.selectedPage = result.page;
    document.querySelector("#status").textContent = `Connected to ${result.page.name}`;
    document.querySelector("#draft-section").hidden = false;
  } catch (error) {
    alert(error.message);
  }
}

async function createDraft() {
  const content = document.querySelector("#content").value;

  try {
    await jsonRequest("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    document.querySelector("#content").value = "";
    await loadDrafts();
  } catch (error) {
    alert(error.message);
  }
}

async function loadDrafts() {
  const list = document.querySelector("#drafts");

  try {
    const result = await jsonRequest("/api/drafts");
    list.innerHTML = "";

    for (const draft of result.drafts || []) {
      const item = document.createElement("li");
      item.textContent = `${draft.pageName}: ${draft.content} `;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteDraft(draft.id));

      item.append(deleteButton);
      list.append(item);
    }
  } catch (error) {
    alert(error.message);
  }
}

async function deleteDraft(id) {
  try {
    await jsonRequest(`/api/drafts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadDrafts();
  } catch (error) {
    alert(error.message);
  }
}

document.querySelector("#select-page").addEventListener("click", selectPage);
document.querySelector("#create-draft").addEventListener("click", createDraft);
loadConnection();
