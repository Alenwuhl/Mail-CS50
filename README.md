# Mail Client Web Application

This is a single-page email client web application built using **JavaScript** for the front-end and **Django** for the back-end. The project simulates the functionality of a basic email client, allowing users to send, receive, archive, and reply to emails, as well as manage their inboxes. The purpose of this project is purely educational, and the design and functionality have not been optimized for real-world usage.


## Features

### 1. **Send Email**
   - Users can compose and send emails to someone.
   - After sending an email, the user is automatically redirected to the "Sent" mailbox.

### 2. **Mailboxes**
   - The app has three mailboxes:
     - **Inbox**: Displays all received emails.
     - **Sent**: Shows all emails the user has sent.
     - **Archive**: Stores archived emails.
   - Emails are displayed with the sender's name, subject, and timestamp.
   - Unread emails are highlighted with a white background, while read emails have a gray background.

### 3. **View Email**
   - Users can click on any email to view its content.
   - Each email displays the sender, recipients, subject, timestamp, and body.
   - When an email is opened, it is automatically marked as "read."

### 4. **Archive/Unarchive Emails**
   - Emails in the inbox can be archived by clicking the "Archive" button.
   - Archived emails can be unarchived and moved back to the inbox.
   - The application automatically reloads the appropriate mailbox after archiving or unarchiving.

### 5. **Reply to Emails**
   - Users can reply to any received email.
   - The reply form is pre-filled with the recipient’s email, subject (prefixed with "Re:"), and a quoted copy of the original email in the body.

## API Integration

This web application communicates with the Django backend using the following API routes:
- **GET /emails/<mailbox>**: Fetches all emails in a specific mailbox (inbox, sent, or archive).
- **GET /emails/<int:email_id>**: Fetches details of a specific email by its ID.
- **POST /emails**: Sends a new email.
- **PUT /emails/<int:email_id>**: Updates an email's "read" or "archived" status.

## How to Run

1. Download the distribution code and navigate into the `mail` directory.
2. Run the following commands:
   ```bash
   python3 manage.py makemigrations mail
   python3 manage.py migrate
   python3 manage.py runserver
3. Open the web browser and navigate to http://127.0.0.1:8000/ to use the application.

## Demo
Check out the video demo of the application here: https://youtu.be/1vQVhTYQ9-Q?si=-ocqvWCPpNSbYFhr

## Technologies Used
- **JavaScript**: Front-end logic and interaction with the API.
- **Django**: Back-end framework to handle email data and API requests.
- **HTML/CSS**: Structure and design of the front-end.
