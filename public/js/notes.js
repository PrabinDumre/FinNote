function handleNoteTypeChange(value) {
    const customTypeInput = document.getElementById('customNoteType');
    customTypeInput.style.display = value === 'other' ? 'block' : 'none';
    if (value !== 'other') {
        customTypeInput.value = '';
    }
}

class NotesManager {
    constructor() {
        this.notes = [];
        this.initializeDates();
        this.initializeEventListeners();
        this.fetchNotes();  // Fetch notes from database when the page loads
    }

    async saveNoteToDB(note) {
        try {
            // Validate note data before sending
            if (!note.title || !note.type) {
                this.showNotification("Title and type are required.", "error");
                return false;
            }

            // For list type notes, ensure content is an array and not empty
            if (note.noteType === "list" && (!Array.isArray(note.content) || note.content.length === 0)) {
                this.showNotification("Please add at least one item to the list.", "error");
                return false;
            }

            // Process content based on note type
            let processedContent = note.content;
            if (note.noteType === "list") {
                processedContent = Array.isArray(note.content) ? note.content.filter(item => item.trim() !== '') : [];
            } else if (note.noteType === "text") {
                processedContent = note.content ? note.content.trim() : '';
            }

            // Show a saving notification
            this.showNotification("Saving your note...", "info");

            // Generate a temporary ID for optimistic UI update
            const tempId = 'temp_' + Date.now();
            const tempNote = {
                _id: tempId,
                title: note.title,
                content: processedContent,
                type: note.type,
                noteType: note.noteType || "text",
                image: note.image || "",
                isPinned: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Add the temporary note to the UI
            this.notes.unshift(tempNote); // Add to beginning instead of end
            this.renderNotes();

            // Send the request to the server
            const response = await fetch("/notes/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: note.title,
                    content: processedContent,
                    type: note.type,
                    noteType: note.noteType || "text",
                    image: note.image || ""
                })
            });
    
            if (response.ok) {
                // Replace the temporary note with the actual one from the server
                const data = await response.json();
                const savedNote = data.note || data;
                
                // Remove the temporary note
                this.notes = this.notes.filter(n => n._id !== tempId);
                
                // Add the saved note from the server to the beginning
                if (savedNote && savedNote._id) {
                    this.notes.unshift(savedNote);
                } else {
                    // If the server response doesn't have the expected format,
                    // fetch all notes to ensure we have the correct data
                    await this.fetchNotes();
                    // Show success notification after we're sure the data is loaded
                    this.showNotification("Note saved successfully!");
                    return true;
                }
                
                // Update the UI with the updated note list
                this.renderNotes();
                
                // Show a success notification
                this.showNotification("Note saved successfully!");
                
                return true;
            } else {
                // Remove the temporary note if there was an error
                this.notes = this.notes.filter(n => n._id !== tempId);
                this.renderNotes();
                
                const errorData = await response.json();
                this.showNotification(errorData.message || "Error adding note.", "error");
                return false;
            }
        } catch (error) {
            console.error("Error:", error);
            this.showNotification("Failed to save note. Please try again.", "error");
            return false;
        }
    }

    async fetchNotes() {
        try {
            const response = await fetch("/notes/get");
            if (!response.ok) throw new Error("Failed to fetch notes");
    
            this.notes = await response.json();
            this.renderNotes();
        } catch (error) {
            console.error("Error fetching notes:", error);
        }
    }

    initializeDates() {
        const dateContainer = document.getElementById('dateContainer');
        const dates = [];
        const today = new Date();

        for (let i = -3; i <= 7; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            dates.push(date);
        }

        dateContainer.innerHTML = dates.map((date, index) => `
            <div class="date-item ${index === 3 ? 'active' : ''}">
                <div class="day">${date.getDate()}</div>
                <div class="month">${date.toLocaleString('default', { month: 'short' })}</div>
            </div>
        `).join('');
    }

    initializeEventListeners() {
        // Add Note Button and Type Selector
        const addNoteBtn = document.querySelector('.add-note-btn');
        const noteTypeSelector = document.getElementById('noteTypeSelector');
        
        addNoteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            noteTypeSelector.classList.toggle('active');
        });

        // Note Type Selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', (e) => {
            e.preventDefault();
                const type = e.currentTarget.getAttribute('data-type');
                noteTypeSelector.classList.remove('active');
                document.getElementById(`${type}NoteModal`).classList.add('show');
            });
        });

        // Close buttons for modals
        document.querySelectorAll('.close-btn, .cancel-btn').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) modal.classList.remove('show');
            });
        });

        // Click outside to close modals
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('show'));
            }
        });

        // List items functionality
    const addListItemBtn = document.querySelector('.add-list-item');
    const listItems = document.getElementById('listItems');

        if (addListItemBtn && listItems) {
            addListItemBtn.addEventListener('click', () => {
            const newItem = document.createElement('div');
            newItem.className = 'list-item';
            newItem.innerHTML = `
                <span class="list-marker">•</span>
                <input type="text" class="item-text" placeholder="List item">
                <button type="button" class="remove-item">×</button>
            `;
            listItems.appendChild(newItem);

                newItem.querySelector('.remove-item').addEventListener('click', () => newItem.remove());
        });
    }

    // Image upload preview
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');

        if (imageUpload && imagePreview) {
            imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                    reader.onload = (e) => {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Form submissions
        this.setupFormHandlers();

        // Search functionality
        const searchInput = document.getElementById('searchNotes');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchNotes(searchInput.value));
        }

        // Add event listeners for note actions
        document.addEventListener('DOMContentLoaded', function() {
            // Edit note
            document.querySelectorAll('.edit-note').forEach(button => {
                button.addEventListener('click', function() {
                    const noteId = this.dataset.id;
                    const noteCard = this.closest('.note-card');
                    const noteType = noteCard.classList.contains('text-note') ? 'text' :
                                   noteCard.classList.contains('list-note') ? 'list' : 'image';
                    
                    // Open the appropriate modal for editing
                    const modal = document.getElementById(`${noteType}NoteModal`);
        modal.classList.add('show');

                    // Pre-fill the form with existing note data
                    const title = noteCard.querySelector('h3').textContent;
                    const content = noteCard.querySelector('.note-content').innerHTML;
                    const type = noteCard.querySelector('.note-type').textContent;
                    
                    // Set form values based on note type
                    if (noteType === 'text') {
                        document.getElementById('textNoteTitle').value = title;
                        document.getElementById('textDescription').value = content;
                        document.getElementById('textNoteType').value = type;
                    } else if (noteType === 'list') {
                        document.getElementById('listNoteTitle').value = title;
                        // Handle list items
                        const listItems = noteCard.querySelectorAll('li');
                        const listContainer = document.getElementById('listItems');
                        listContainer.innerHTML = '';
                        listItems.forEach(item => {
                            addListItem(item.textContent);
                        });
                    } else if (noteType === 'image') {
                        document.getElementById('imageNoteTitle').value = title;
                        const description = noteCard.querySelector('.image-description');
                        if (description) {
                            document.getElementById('imageDescription').value = description.textContent;
                        }
                    }
                    
                    // Add hidden input for note ID
                    const idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'noteId';
                    idInput.value = noteId;
                    modal.querySelector('form').appendChild(idInput);
                });
            });

            // Pin/Unpin note
            document.querySelectorAll('.pin-note').forEach(button => {
                button.addEventListener('click', async function() {
                    const noteId = this.dataset.id;
                    try {
                        const response = await fetch(`/notes/pin/${noteId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
    
            if (response.ok) {
                            const data = await response.json();
                            const noteCard = this.closest('.note-card');
                            if (data.isPinned) {
                                noteCard.classList.add('pinned');
                                this.innerHTML = '<span class="icon">📌</span> Unpin';
            } else {
                                noteCard.classList.remove('pinned');
                                this.innerHTML = '<span class="icon">📌</span> Pin';
                            }
                            // Move pinned notes to the top
                            const notesGrid = document.querySelector('.notes-grid');
                            notesGrid.insertBefore(noteCard, notesGrid.firstChild);
            }
        } catch (error) {
                        console.error('Error updating pin status:', error);
                    }
                });
            });

            // View note details
            document.querySelectorAll('.view-details').forEach(button => {
                button.addEventListener('click', async function() {
                    const noteId = this.dataset.id;
                    try {
                        const response = await fetch(`/notes/${noteId}`);
                        const note = await response.json();
                        
                        // Create and show details modal
                        const modal = document.createElement('div');
                        modal.className = 'modal show';
                        modal.innerHTML = `
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h2>Note Details</h2>
                                    <button class="close-btn">&times;</button>
                                </div>
                                <div class="note-details">
                                    <p><strong>Title:</strong> ${note.title}</p>
                                    <p><strong>Type:</strong> ${note.type}</p>
                                    <p><strong>Created:</strong> ${new Date(note.createdAt).toLocaleString()}</p>
                                    <p><strong>Last Modified:</strong> ${new Date(note.updatedAt).toLocaleString()}</p>
                                    <div class="note-content">
                                        ${note.noteType === 'text' ? `<p>${note.content}</p>` :
                                          note.noteType === 'list' ? `<ul>${note.content.map(item => `<li>${item}</li>`).join('')}</ul>` :
                                          `<img src="${note.image}" alt="Note image"><p>${note.content}</p>`}
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        document.body.appendChild(modal);
                        
                        // Close modal handler
                        modal.querySelector('.close-btn').addEventListener('click', () => {
                            modal.remove();
                        });
                    } catch (error) {
                        console.error('Error fetching note details:', error);
            }
        });
    });

            // Delete note
            document.querySelectorAll('.delete-note').forEach(button => {
                button.addEventListener('click', async function() {
                    if (confirm('Are you sure you want to delete this note?')) {
                        const noteId = this.dataset.id;
                        try {
                            const response = await fetch(`/notes/delete/${noteId}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                const noteCard = this.closest('.note-card');
                                noteCard.remove();
                                
                                // Show empty state if no notes left
                                const notesGrid = document.querySelector('.notes-grid');
                                if (!notesGrid.querySelector('.note-card')) {
                                    notesGrid.innerHTML = `
                                        <div class="no-notes">
                                            <p>No notes yet. Click the + button to create your first note!</p>
                                        </div>
                                    `;
                                }
                            }
                        } catch (error) {
                            console.error('Error deleting note:', error);
                        }
                    }
                });
            });
        });
    }

    setupFormHandlers() {
        // Text Note Form
        const textNoteForm = document.getElementById("textNoteForm");
        if (textNoteForm) {
            textNoteForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const title = document.getElementById("textNoteTitle").value;
                const content = document.getElementById("textDescription").value;
                const type = document.getElementById("textNoteType").value;
                const noteId = textNoteForm.querySelector('input[name="noteId"]')?.value;

                if (noteId) {
                    // Update existing note
                    try {
                        this.showNotification("Updating note...", "info");
                        
                        const response = await fetch(`/notes/update/${noteId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                title,
                                content,
                                type,
                                noteType: "text"
                            })
                        });

                        if (response.ok) {
                            // Close the modal
                            document.getElementById("textNoteModal").classList.remove("show");
                            
                            // Fetch and render updated notes
                            await this.fetchNotes();
                            this.showNotification("Note updated successfully!");
                        } else {
                            this.showNotification('Error updating note. Please try again.', 'error');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        this.showNotification('Error updating note. Please try again.', 'error');
                    }
                } else {
                    // Create new note
                    const success = await this.saveNoteToDB({
                        title,
                        content,
                        type,
                        noteType: "text"
                    });

                    if (success) {
                        textNoteForm.reset();
                        document.getElementById("textNoteModal").classList.remove("show");
                    }
                }
            });
        }

        // List Note Form
        const listNoteForm = document.getElementById("listNoteForm");
        if (listNoteForm) {
            listNoteForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const title = document.getElementById("listNoteTitle").value;
                const type = document.getElementById("listNoteType").value;
                const items = Array.from(document.querySelectorAll(".item-text"))
                    .map(input => input.value.trim())
                    .filter(item => item !== '');
                const noteId = listNoteForm.querySelector('input[name="noteId"]')?.value;

                if (items.length === 0) {
                    this.showNotification("Please add at least one item to the list.", "error");
                    return;
                }

                if (noteId) {
                    // Update existing note
                    try {
                        this.showNotification("Updating note...", "info");
                        
                        const response = await fetch(`/notes/update/${noteId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                title,
                                content: items,
                                type,
                                noteType: "list"
                            })
                        });

                        if (response.ok) {
                            // Close the modal
                            document.getElementById("listNoteModal").classList.remove("show");
                            
                            // Fetch and render updated notes
                            await this.fetchNotes();
                            this.showNotification("Note updated successfully!");
                        } else {
                            this.showNotification('Error updating note. Please try again.', 'error');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        this.showNotification('Error updating note. Please try again.', 'error');
                    }
                } else {
                    // Create new note
                    const success = await this.saveNoteToDB({
                        title,
                        content: items,
                        type,
                        noteType: "list"
                    });

                    if (success) {
                        listNoteForm.reset();
                        document.getElementById("listItems").innerHTML = '';
                        document.getElementById("listNoteModal").classList.remove("show");
                    }
                }
            });
        }

        // Image Note Form
        const imageNoteForm = document.getElementById("imageNoteForm");
        if (imageNoteForm) {
            imageNoteForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const title = document.getElementById("imageNoteTitle").value;
                const type = document.getElementById("imageNoteType").value;
                const description = document.getElementById("imageDescription").value;
                const image = document.querySelector("#imagePreview img")?.src || "";
                const noteId = imageNoteForm.querySelector('input[name="noteId"]')?.value;

                if (noteId) {
                    // Update existing note
                    try {
                        this.showNotification("Updating note...", "info");
                        
                        const response = await fetch(`/notes/update/${noteId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                title,
                                content: description,
                                type,
                                noteType: "image",
                                image
                            })
                        });

                        if (response.ok) {
                            // Close the modal
                            document.getElementById("imageNoteModal").classList.remove("show");
                            
                            // Fetch and render updated notes
                            await this.fetchNotes();
                            this.showNotification("Note updated successfully!");
                        } else {
                            this.showNotification('Error updating note. Please try again.', 'error');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        this.showNotification('Error updating note. Please try again.', 'error');
                    }
                } else {
                    // Create new note
                    const success = await this.saveNoteToDB({
                        title,
                        content: description,
                        type,
                        noteType: "image",
                        image
                    });

                    if (success) {
                        imageNoteForm.reset();
                        document.getElementById("imagePreview").innerHTML = '';
                        document.getElementById("imageNoteModal").classList.remove("show");
                    }
                }
            });
        }
    }

    renderNotes() {
        const notesGrid = document.querySelector('.notes-grid');
        if (!notesGrid) return;

        if (!this.notes || this.notes.length === 0) {
            notesGrid.innerHTML = `
                <div class="no-notes">
                    <p>No notes yet. Click the + button to create your first note!</p>
                </div>`;
            return;
        }

        notesGrid.innerHTML = this.notes.map(note => `
            <div class="note-card ${note.isPinned ? 'pinned' : ''} ${note.noteType}-note" data-note-id="${note._id}">
                <div class="note-header">
                    <h3>${note.title}</h3>
                    <div class="note-actions">
                        <button class="three-dots-btn">⋮</button>
                        <div class="dropdown-content">
                            <button class="edit-note" data-id="${note._id}">
                                <span class="icon">✏️</span> Edit
                            </button>
                            <button class="pin-note" data-id="${note._id}">
                                <span class="icon">📌</span> ${note.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button class="view-details" data-id="${note._id}">
                                <span class="icon">ℹ️</span> Details
                            </button>
                            <button class="delete-note" data-id="${note._id}">
                                <span class="icon">🗑️</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
                <div class="note-content">
                    ${this.renderNoteContent(note)}
                </div>
            </div>
        `).join('');

        // Reattach event listeners
        this.attachNoteEventListeners();
    }

    renderNoteContent(note) {
        switch (note.noteType) {
            case 'text':
                return `<p class="text-content">${note.content ? note.content.replace(/\n/g, '<br>') : ''}</p>
                        <div class="note-type-tag">${note.type || 'Note'}</div>`;
            case 'list':
                if (!Array.isArray(note.content) || note.content.length === 0) return `<div class="note-type-tag">${note.type || "List"}</div>`;
                return `<ul class="list-content">
                    ${note.content.map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="note-type-tag">${note.type || 'List'}</div>`;
            case 'image':
                return `
                    <div class="image-container">
                        ${note.image ? `<img src="${note.image}" alt="Note image">` : ''}
                        ${note.content ? `<div class="image-description">${note.content.replace(/\n/g, '<br>')}</div>` : ''}
                    </div>
                    <div class="note-type-tag">${note.type || 'Image'}</div>`;
            default:
                return `<p class="text-content">${note.content ? note.content : ''}</p>
                        <div class="note-type-tag">${note.type || 'Note'}</div>`;
        }
    }

    setupNoteCardListeners(noteElement, noteData) {
        // Three dots menu
        const menuBtn = noteElement.querySelector('.three-dots-btn');
        const dropdownContent = noteElement.querySelector('.dropdown-content');
        
        if (menuBtn && dropdownContent) {
            menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
                const allDropdowns = document.querySelectorAll('.dropdown-content');
                allDropdowns.forEach(dropdown => {
                    if (dropdown !== dropdownContent) {
                        dropdown.style.display = 'none';
                    }
                });
                dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.note-actions')) {
                    dropdownContent.style.display = 'none';
                }
            });
        }

        // Edit note
        const editBtn = noteElement.querySelector('.edit-note');
        if (editBtn) {
            editBtn.addEventListener('click', async () => {
                const modal = document.getElementById(`${noteData.noteType}NoteModal`);
                if (modal) {
                    // Pre-fill the form
                    const form = modal.querySelector('form');
                    const titleInput = form.querySelector(`#${noteData.noteType}NoteTitle`);
                    const typeSelect = form.querySelector(`#${noteData.noteType}NoteType`);
                    
                    if (titleInput) titleInput.value = noteData.title;
                    if (typeSelect) typeSelect.value = noteData.type;

                    // Handle content based on note type
                    if (noteData.noteType === 'text') {
                        const contentInput = form.querySelector('#textDescription');
                        if (contentInput) contentInput.value = noteData.content;
                    } else if (noteData.noteType === 'list') {
                        const listContainer = document.getElementById('listItems');
                        if (listContainer) {
                            listContainer.innerHTML = '';
                            noteData.content.forEach(item => {
                                const itemDiv = document.createElement('div');
                                itemDiv.className = 'list-item';
                                itemDiv.innerHTML = `
                                    <span class="list-marker">•</span>
                                    <input type="text" class="item-text" value="${item}">
                                    <button type="button" class="remove-item">×</button>
                                `;
                                listContainer.appendChild(itemDiv);

                                // Add remove item functionality
                                itemDiv.querySelector('.remove-item').addEventListener('click', () => itemDiv.remove());
                            });
                        }
                    } else if (noteData.noteType === 'image') {
                        const descInput = form.querySelector('#imageDescription');
                        const preview = document.getElementById('imagePreview');
                        if (descInput) descInput.value = noteData.content;
                        if (preview && noteData.image) {
                            preview.innerHTML = `<img src="${noteData.image}" alt="Preview">`;
                        }
                    }

                    // Add note ID to form
                    let idInput = form.querySelector('input[name="noteId"]');
                    if (!idInput) {
                        idInput = document.createElement('input');
                        idInput.type = 'hidden';
                        idInput.name = 'noteId';
                        form.appendChild(idInput);
                    }
                    idInput.value = noteData._id;

                    modal.classList.add('show');
                }
            });
        }

        // Pin/Unpin note
        const pinBtn = noteElement.querySelector('.pin-note');
        if (pinBtn) {
            pinBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(`/notes/pin/${noteData._id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.isPinned) {
                            noteElement.classList.add('pinned');
                            pinBtn.innerHTML = '<span class="icon">📌</span> Unpin';
                            // Move to top
                            const notesGrid = noteElement.parentElement;
                            notesGrid.insertBefore(noteElement, notesGrid.firstChild);
                        } else {
                            noteElement.classList.remove('pinned');
                            pinBtn.innerHTML = '<span class="icon">📌</span> Pin';
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error updating pin status');
                }
            });
        }

        // View details
        const detailsBtn = noteElement.querySelector('.view-details');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(`/notes/${noteData._id}`);
                    if (response.ok) {
                        const note = await response.json();
        const modal = document.createElement('div');
                        modal.className = 'modal details-modal show';
        modal.innerHTML = `
                            <div class="modal-content">
                <div class="modal-header">
                    <h2>Note Details</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="note-details">
                                    <p><strong>Title:</strong> ${note.title}</p>
                                    <p><strong>Type:</strong> ${note.type}</p>
                                    <p><strong>Created:</strong> ${new Date(note.createdAt).toLocaleString()}</p>
                                    <p><strong>Last Modified:</strong> ${new Date(note.updatedAt).toLocaleString()}</p>
                                    <div class="note-content">
                                        ${this.renderNoteContent(note)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

                        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error fetching note details');
                }
            });
        }

        // Delete note
        const deleteBtn = noteElement.querySelector('.delete-note');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this note?')) {
                    try {
                        const response = await fetch(`/notes/delete/${noteData._id}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            noteElement.remove();
                            // Show empty state if no notes left
                            const notesGrid = document.querySelector('.notes-grid');
                            if (!notesGrid.querySelector('.note-card')) {
                                notesGrid.innerHTML = `
                                    <div class="no-notes">
                                        <p>No notes yet. Click the + button to create your first note!</p>
                                    </div>
                                `;
                            }
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        alert('Error deleting note. Please try again.');
                    }
                }
            });
        }
    }

    async deleteNote(noteId) {
        try {
            const response = await fetch(`/notes/delete/${noteId}`, { method: "DELETE" });
            if (response.ok) {
                await this.fetchNotes();
            } else {
                alert("Error deleting note.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    async togglePin(noteId) {
        try {
            const response = await fetch(`/notes/toggle-pin/${noteId}`, { method: "POST" });
            if (response.ok) {
                await this.fetchNotes();
            } else {
                alert("Error toggling pin status.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    showEditModal(noteData) {
        // Implementation for edit modal
        // This would be similar to your existing showEditNoteModal function
    }

    showDetailsModal(noteData) {
        // Implementation for details modal
        // This would be similar to your existing showNoteDetails function
    }

    searchNotes(query) {
        const filteredNotes = this.notes.filter(note => 
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase()) ||
            note.type.toLowerCase().includes(query.toLowerCase())
        );
        this.renderFilteredNotes(filteredNotes);
    }

    renderFilteredNotes(filteredNotes) {
        const notesGrid = document.getElementById('notesGrid');
        if (!notesGrid) return;
        
        notesGrid.innerHTML = filteredNotes.map(note => this.createNoteHTML(note)).join('');
        
        filteredNotes.forEach(note => {
            const noteElement = notesGrid.querySelector(`[data-note-id="${note._id}"]`);
            if (noteElement) {
                this.setupNoteCardListeners(noteElement, note);
            }
        });
    }

    // Add a notification helper method
    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button class="close-notification">×</button>
        `;
        
        // Add to the DOM
        document.body.appendChild(notification);
        
        // Add animation to show the notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300); // Wait for the fade out animation
        }, 3000);
        
        // Add close button event listener
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }

    // Implement the attachNoteEventListeners method
    attachNoteEventListeners() {
        // Attach event listeners to note cards
        document.querySelectorAll('.note-card').forEach(noteCard => {
            const noteId = noteCard.getAttribute('data-note-id');
            
            // Three dots menu toggle
            const dotsBtn = noteCard.querySelector('.three-dots-btn');
            const dropdown = noteCard.querySelector('.dropdown-content');
            
            if (dotsBtn && dropdown) {
                dotsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close all other dropdowns
                    document.querySelectorAll('.dropdown-content').forEach(d => {
                        if (d !== dropdown) d.style.display = 'none';
                    });
                    // Toggle current dropdown
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                });
            }
            
            // Edit note button
            const editBtn = noteCard.querySelector('.edit-note');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    openEditNoteModal(editBtn.getAttribute('data-id'));
                });
            }
            
            // Pin/unpin note button
            const pinBtn = noteCard.querySelector('.pin-note');
            if (pinBtn) {
                pinBtn.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`/notes/pin/${pinBtn.getAttribute('data-id')}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        
                        if (response.ok) {
                            // Instead of reloading, update UI and fetch notes
                            await this.fetchNotes();
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        this.showNotification('Error updating pin status', 'error');
                    }
                });
            }
            
            // View details button
            const detailsBtn = noteCard.querySelector('.view-details');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                    openNoteDetailsModal(detailsBtn.getAttribute('data-id'));
                });
            }
            
            // Delete note button
            const deleteBtn = noteCard.querySelector('.delete-note');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this note?')) {
                        try {
                            const response = await fetch(`/notes/delete/${deleteBtn.getAttribute('data-id')}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                // Instead of removing just this note, fetch all notes again
                                await this.fetchNotes();
                                this.showNotification('Note deleted successfully!');
                            }
                        } catch (error) {
                            console.error('Error:', error);
                            this.showNotification('Error deleting note', 'error');
                        }
                    }
                });
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.note-actions')) {
                document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        });
    }
}

// Initialize Notes Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notesManager = new NotesManager();
});

// Handle three-dot menu functionality
document.addEventListener('click', function(e) {
    // Close all dropdowns when clicking outside
    if (!e.target.matches('.three-dots-btn')) {
        document.querySelectorAll('.dropdown-content').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// Toggle dropdown menu
document.querySelectorAll('.three-dots-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = this.nextElementSibling;
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-content').forEach(otherDropdown => {
            if (otherDropdown !== dropdown) {
                otherDropdown.classList.remove('show');
            }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('show');
    });
});

// Handle menu actions
document.querySelectorAll('.dropdown-content button').forEach(button => {
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        const noteId = this.dataset.id;
        const action = this.classList[0];

        switch(action) {
            case 'edit-note':
                // Open edit modal with note data
                openEditNoteModal(noteId);
                break;
            
            case 'pin-note':
                // Toggle pin status
                try {
                    const response = await fetch(`/notes/pin/${noteId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    if (response.ok) {
                        location.reload();
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
                break;
            
            case 'view-details':
                // Open details modal
                openNoteDetailsModal(noteId);
                break;
            
            case 'delete-note':
                // Show confirmation dialog
                if (confirm('Are you sure you want to delete this note?')) {
                    try {
                        const response = await fetch(`/notes/delete/${noteId}`, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            const noteCard = this.closest('.note-card');
                            noteCard.remove();
                            
                            // Show empty state if no notes left
                            const notesGrid = document.querySelector('.notes-grid');
                            if (!notesGrid.querySelector('.note-card')) {
                                notesGrid.innerHTML = `
                                    <div class="no-notes">
                                        <p>No notes yet. Click the + button to create your first note!</p>
                                    </div>
                                `;
                            }
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        alert('Error deleting note. Please try again.');
                    }
                }
                break;
        }

        // Close dropdown after action
        this.closest('.dropdown-content').classList.remove('show');
    });
});

// Function to open edit modal
function openEditNoteModal(noteId) {
    // Fetch note data and populate edit modal
    fetch(`/notes/${noteId}`)
        .then(response => response.json())
        .then(note => {
            // Populate the appropriate modal based on note type
            if (note.noteType === 'text') {
                const modal = document.getElementById('textNoteModal');
                modal.querySelector('#textNoteTitle').value = note.title;
                modal.querySelector('#textDescription').value = note.content;
                modal.querySelector('#textNoteType').value = note.type;
                
                // Add hidden input for note ID
                let idInput = modal.querySelector('input[name="noteId"]');
                if (!idInput) {
                    idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'noteId';
                    modal.querySelector('form').appendChild(idInput);
                }
                idInput.value = noteId;
                
                // Show modal
                modal.style.display = 'block';
                modal.classList.add('show');
            } else if (note.noteType === 'list') {
                const modal = document.getElementById('listNoteModal');
                modal.querySelector('#listNoteTitle').value = note.title;
                modal.querySelector('#listNoteType').value = note.type;
                
                // Clear and populate list items
                const listContainer = document.getElementById('listItems');
                listContainer.innerHTML = '';
                note.content.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'list-item';
                    itemDiv.innerHTML = `
                        <span class="list-marker">•</span>
                        <input type="text" class="item-text" value="${item}">
                        <button type="button" class="remove-item">×</button>
                    `;
                    listContainer.appendChild(itemDiv);
                });
                
                // Add hidden input for note ID
                let idInput = modal.querySelector('input[name="noteId"]');
                if (!idInput) {
                    idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'noteId';
                    modal.querySelector('form').appendChild(idInput);
                }
                idInput.value = noteId;
                
                modal.style.display = 'block';
                modal.classList.add('show');
            } else if (note.noteType === 'image') {
                const modal = document.getElementById('imageNoteModal');
                modal.querySelector('#imageNoteTitle').value = note.title;
                modal.querySelector('#imageNoteType').value = note.type;
                modal.querySelector('#imageDescription').value = note.content;
                
                // Show image preview
                if (note.image) {
                    const preview = document.getElementById('imagePreview');
                    preview.innerHTML = `<img src="${note.image}" alt="Preview">`;
                }
                
                // Add hidden input for note ID
                let idInput = modal.querySelector('input[name="noteId"]');
                if (!idInput) {
                    idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'noteId';
                    modal.querySelector('form').appendChild(idInput);
                }
                idInput.value = noteId;
                
                modal.style.display = 'block';
                modal.classList.add('show');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading note data. Please try again.');
        });
}

// Function to open note details modal
function openNoteDetailsModal(noteId) {
    fetch(`/notes/${noteId}`)
        .then(response => response.json())
        .then(note => {
            const modal = document.createElement('div');
            modal.className = 'modal details-modal show';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Note Details</h2>
                        <button class="close-btn">×</button>
                    </div>
                    <div class="note-details">
                        <p><strong>Title:</strong> <span>${note.title}</span></p>
                        <p><strong>Type:</strong> <span>${note.type}</span></p>
                        <p><strong>Created:</strong> <span>${new Date(note.createdAt).toLocaleString()}</span></p>
                        <p><strong>Last Modified:</strong> <span>${new Date(note.updatedAt).toLocaleString()}</span></p>
                        <div class="note-content">
                            ${note.content || ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal handlers
            const closeBtn = modal.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                }
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading note details. Please try again.');
        });
}

// Helper function to render note content based on type
function renderNoteContent(note) {
    switch (note.noteType) {
        case 'text':
            return `<p class="text-content">${note.content ? note.content.replace(/\n/g, '<br>') : ''}</p>`;
        case 'list':
            if (!Array.isArray(note.content)) return '';
            return `<ul class="list-content">
                ${note.content.map(item => `<li>${item}</li>`).join('')}
            </ul>`;
        case 'image':
            return `
                <div class="image-container">
                    ${note.image ? `<img src="${note.image}" alt="Note image">` : ''}
                    ${note.content ? `<p class="image-description">${note.content.replace(/\n/g, '<br>')}</p>` : ''}
                </div>`;
        default:
            return `<p class="text-content">${note.content ? note.content : ''}</p>`;
    }
} 