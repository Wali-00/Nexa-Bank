<div align="center">

  <h1>🏦 Nexa Bank</h1>

  <h3>
    Role-Based Banking Management System
  </h3>

  <p>
    A complete DBMS project built with
    <strong>FastAPI</strong>,
    <strong>MySQL</strong>,
    <strong>HTML</strong>,
    <strong>CSS</strong>,
    and
    <strong>JavaScript</strong>.
  </p>

  <p>
    Nexa Bank simulates the core operations of a modern banking system,
    including customer onboarding, KYC verification, account management,
    financial transactions, loan processing, branch-level access control,
    audit logs, and administration.
  </p>

  <hr>

</div>


<h2>📌 Project Overview</h2>

<p>
  <strong>Nexa Bank</strong> is a database-driven banking management system
  designed as an academic DBMS project.
</p>

<p>
  The system provides separate dashboards and responsibilities for:
</p>

<ul>
  <li>Customer</li>
  <li>Account Officer</li>
  <li>Loan Officer</li>
  <li>Branch Manager</li>
  <li>Administrator</li>
</ul>

<p>
  The project focuses on practical implementation of relational database
  concepts such as primary keys, foreign keys, joins, transactions,
  role-based access control, branch-level data isolation, audit logging,
  and financial data management.
</p>


<hr>


<h2>✨ Main Features</h2>


<h3>👤 Customer</h3>

<ul>
  <li>User registration</li>
  <li>Secure password storage</li>
  <li>Customer login</li>
  <li>Customer profile</li>
  <li>Customer information update</li>
  <li>Account application</li>
  <li>KYC document submission</li>
  <li>Application status tracking</li>
  <li>Bank account overview</li>
  <li>Multiple account support</li>
  <li>Transaction history</li>
  <li>Fund transfer</li>
  <li>Beneficiary management</li>
  <li>Bill payment</li>
  <li>Fixed deposit management</li>
  <li>Loan application</li>
  <li>Loan status tracking</li>
  <li>Loan installment view</li>
  <li>Loan repayment</li>
  <li>Notifications</li>
  <li>Profile and settings</li>
</ul>


<h3>🏦 Account Officer</h3>

<ul>
  <li>Branch-specific customer access</li>
  <li>View account applications</li>
  <li>Review account applications</li>
  <li>KYC verification</li>
  <li>Approve or reject applications</li>
  <li>Automatic account creation after approval</li>
  <li>Customer management</li>
  <li>Branch-restricted operations</li>
</ul>


<h3>💰 Loan Officer</h3>

<ul>
  <li>Branch-specific customer access</li>
  <li>View loan applications</li>
  <li>Review loan applications</li>
  <li>Approve or reject loan applications</li>
  <li>Create loans from approved applications</li>
  <li>Loan disbursement</li>
  <li>Active loan monitoring</li>
  <li>Repayment monitoring</li>
  <li>Loan installment management</li>
  <li>Branch-specific loan reports</li>
</ul>


<h3>🏢 Branch Manager</h3>

<ul>
  <li>Branch dashboard</li>
  <li>Branch overview</li>
  <li>View branch customers</li>
  <li>View branch accounts</li>
  <li>View branch transactions</li>
  <li>View branch loans</li>
  <li>Branch reports</li>
  <li>Profile management</li>
</ul>


<h3>🛡 Administrator</h3>

<ul>
  <li>Bank-wide dashboard</li>
  <li>User management</li>
  <li>Employee management</li>
  <li>Customer management</li>
  <li>Branch management</li>
  <li>Account management</li>
  <li>Transaction monitoring</li>
  <li>Loan management</li>
  <li>System reports</li>
  <li>Audit log monitoring</li>
  <li>Notification monitoring</li>
  <li>Bank-wide data visibility</li>
</ul>


<hr>


<h2>🧑‍💻 Technology Stack</h2>

<table>
  <tr>
    <th>Layer</th>
    <th>Technology</th>
  </tr>

  <tr>
    <td>Frontend</td>
    <td>HTML, CSS, JavaScript</td>
  </tr>

  <tr>
    <td>Backend</td>
    <td>FastAPI</td>
  </tr>

  <tr>
    <td>Programming Language</td>
    <td>Python</td>
  </tr>

  <tr>
    <td>Database</td>
    <td>MySQL</td>
  </tr>

  <tr>
    <td>Database Connector</td>
    <td>PyMySQL</td>
  </tr>

  <tr>
    <td>Server</td>
    <td>Uvicorn</td>
  </tr>

  <tr>
    <td>Password Hashing</td>
    <td>pwdlib</td>
  </tr>

  <tr>
    <td>Frontend Development Server</td>
    <td>VS Code Live Server</td>
  </tr>
</table>


<hr>


<h2>📂 Project Structure</h2>

<pre>
nexa-bank/
│
├── backend/
│   │
│   ├── main.py
│   ├── raw_database.py
│   │
│   ├── routers/
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── employee.py
│   │   ├── account_application.py
│   │   ├── notification.py
│   │   ├── loan_application.py
│   │   └── ...
│   │
│   ├── schemas/
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── account_application.py
│   │   ├── loan_application.py
│   │   └── ...
│   │
│   ├── utils/
│   │   └── system_events.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   │
│   ├── login.html
│   ├── register.html
│   ├── kyc-submit.html
│   ├── application-status.html
│   │
│   ├── customer-dashboard.html
│   ├── account-officer-dashboard.html
│   ├── loan-officer-dashboard.html
│   ├── branch-manager-dashboard.html
│   ├── admin-dashboard.html
│   │
│   ├── css/
│   │   ├── customerCss.css
│   │   └── ...
│   │
│   └── js/
│       ├── customer-dashboard.js
│       ├── account-officer-dashboard.js
│       ├── loan-officer-dashboard.js
│       ├── branch-manager-dashboard.js
│       ├── admin-dashboard.js
│       └── ...
│
├── database/
│   ├── nexa_bank_schema.sql
│   └── sample_data.sql
│
├── docs/
│   ├── ERD.png
│   ├── schema-diagram.png
│   └── screenshots/
│
├── .gitignore
├── README.md
└── LICENSE
</pre>


<hr>


<h2>🗄 Database Design</h2>

<p>
  Nexa Bank uses a relational MySQL database with multiple connected entities.
</p>

<h3>Major Tables</h3>

<ul>
  <li>users</li>
  <li>roles</li>
  <li>user_roles</li>
  <li>customers</li>
  <li>employees</li>
  <li>departments</li>
  <li>positions</li>
  <li>branches</li>
  <li>account_types</li>
  <li>account_applications</li>
  <li>accounts</li>
  <li>kyc_verifications</li>
  <li>transaction_types</li>
  <li>transactions</li>
  <li>transaction_entries</li>
  <li>beneficiaries</li>
  <li>loan_types</li>
  <li>loan_applications</li>
  <li>loans</li>
  <li>loan_payments</li>
  <li>notifications</li>
  <li>audit_logs</li>
</ul>


<h3>Important Relationships</h3>

<pre>
Users
  │
  ├── Customer
  │
  └── Employee


Users
  │
  └── User Roles
          │
          └── Roles


Branches
  │
  ├── Customers
  ├── Employees
  └── Accounts


Customers
  │
  ├── Account Applications
  ├── Accounts
  ├── Loan Applications
  └── Loans


Loan Applications
  │
  └── Loans
          │
          └── Loan Payments


Transactions
  │
  └── Transaction Entries
          │
          └── Accounts
</pre>


<hr>


<h2>🔐 Role-Based Access Control</h2>

<p>
  Nexa Bank separates functionality according to user role.
</p>

<table>
  <tr>
    <th>Role</th>
    <th>Access Scope</th>
  </tr>

  <tr>
    <td>Customer</td>
    <td>Own banking data only</td>
  </tr>

  <tr>
    <td>Account Officer</td>
    <td>Customers and account applications of assigned branch</td>
  </tr>

  <tr>
    <td>Loan Officer</td>
    <td>Customers and loan applications of assigned branch</td>
  </tr>

  <tr>
    <td>Branch Manager</td>
    <td>Branch-wide monitoring</td>
  </tr>

  <tr>
    <td>Admin</td>
    <td>Bank-wide access</td>
  </tr>
</table>


<hr>


<h2>🌿 Branch-Level Data Isolation</h2>

<p>
  Account Officers and Loan Officers can only view and manage customers
  belonging to their assigned branch.
</p>

<pre>
Logged-in Officer
        ↓
users.user_id
        ↓
employees.user_id
        ↓
employees.branch_id
        ↓
customers.branch_id
        ↓
Only matching branch data is returned
</pre>

<p>
  This prevents cross-branch access to sensitive customer information.
</p>


<hr>


<h2>🪪 KYC Verification Workflow</h2>

<pre>
Customer Registration
        ↓
Customer Application
        ↓
Account Application
        ↓
KYC Submission
        ↓
NID Document
Customer Photo
Address Proof
        ↓
KYC Status = PENDING
        ↓
Account Officer Review
        ↓
VERIFIED / DOCUMENT_REQUIRED / REJECTED
        ↓
Verified KYC Required for Account Approval
</pre>


<hr>


<h2>💳 Account Creation Workflow</h2>

<pre>
Customer submits Account Application
        ↓
Application Status = SUBMITTED
        ↓
Account Officer Reviews
        ↓
KYC Checked
        ↓
Application APPROVED
        ↓
System Generates Account Number
        ↓
Account Created
        ↓
Balance = 0.00
Available Balance = 0.00
Status = ACTIVE
        ↓
Customer Notification
        ↓
Audit Log
</pre>


<hr>


<h2>💸 Transaction System</h2>

<p>
  Nexa Bank uses a transaction-entry based system to record debit and credit
  operations.
</p>

<h3>Fund Transfer</h3>

<pre>
Sender Account
        ↓
Balance Validation
        ↓
Transaction Created
        ↓
Sender Transaction Entry = DEBIT
        ↓
Receiver Transaction Entry = CREDIT
        ↓
Balances Updated
</pre>

<p>
  This design makes each financial transaction easier to track and audit.
</p>


<hr>


<h2>💰 Loan Management Workflow</h2>

<pre>
Customer
   ↓
Loan Application
   ↓
Status = SUBMITTED
   ↓
Loan Officer Review
   ↓
UNDER_REVIEW
   ↓
APPROVED / REJECTED
   ↓
Approved Application
   ↓
Loan Created
   ↓
EMI Calculated
   ↓
Loan Disbursement
   ↓
Loan Status = ACTIVE
   ↓
Installments Generated
   ↓
Repayment
   ↓
COMPLETED / DEFAULTED
</pre>


<hr>


<h2>📐 EMI Calculation</h2>

<p>
  Nexa Bank calculates monthly EMI using the standard reducing-balance formula.
</p>

<pre>
Monthly Interest Rate =
Annual Interest Rate / 12


EMI =
P × r × (1+r)^n
----------------
(1+r)^n - 1
</pre>

<p>
  Where:
</p>

<ul>
  <li><strong>P</strong> = Principal amount</li>
  <li><strong>r</strong> = Monthly interest rate</li>
  <li><strong>n</strong> = Loan duration in months</li>
</ul>


<hr>


<h2>🔔 Notification System</h2>

<p>
  Important system events automatically create notifications.
</p>

<p>
  Examples:
</p>

<ul>
  <li>Welcome notification</li>
  <li>Account application submitted</li>
  <li>Account application approved</li>
  <li>Account application rejected</li>
  <li>KYC status updates</li>
  <li>Loan application submitted</li>
  <li>Loan approved</li>
  <li>Loan rejected</li>
  <li>Loan created</li>
  <li>Loan disbursed</li>
</ul>


<hr>


<h2>📜 Audit Logging</h2>

<p>
  Nexa Bank records important actions in the audit log.
</p>

<p>
  Audit information may include:
</p>

<ul>
  <li>User ID</li>
  <li>Action</li>
  <li>Entity type</li>
  <li>Entity ID</li>
  <li>Old value</li>
  <li>New value</li>
  <li>IP address</li>
  <li>Timestamp</li>
</ul>

<p>
  Example audit actions:
</p>

<pre>
USER_CREATED
ACCOUNT_APPLICATION_CREATED
ACCOUNT_APPLICATION_UPDATED
ACCOUNT_CREATED_FROM_APPLICATION
LOAN_APPLICATION_CREATED
LOAN_APPLICATION_UPDATED
LOAN_CREATED
NOTIFICATION_CREATED
</pre>


<hr>


<h2>⚙️ Installation</h2>


<h3>1. Clone Repository</h3>

<pre>
git clone https://github.com/tanvirts/nexa-bank-dbms.git
</pre>

<pre>
cd nexa-bank-dbms
</pre>


<h3>2. Create Python Virtual Environment</h3>

<p>
  Open the backend directory:
</p>

<pre>
cd backend
</pre>

<p>
  Create virtual environment:
</p>

<pre>
python -m venv venv
</pre>


<h3>3. Activate Virtual Environment</h3>

<p>
  Windows:
</p>

<pre>
venv\Scripts\activate
</pre>

<p>
  Linux / macOS:
</p>

<pre>
source venv/bin/activate
</pre>


<h3>4. Install Dependencies</h3>

<pre>
pip install -r requirements.txt
</pre>


<hr>


<h2>🔑 Environment Variables</h2>

<p>
  Create a file named:
</p>

<pre>
.env
</pre>

<p>
  Example:
</p>

<pre>
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nexa_bank
</pre>

<p>
  Do not upload your real <code>.env</code> file to GitHub.
</p>


<hr>


<h2>🗄 Database Setup</h2>

<ol>
  <li>Open MySQL or phpMyAdmin.</li>
  <li>Create a database named <code>nexa_bank</code>.</li>
  <li>Import the database schema.</li>
</ol>

<pre>
database/nexa_bank_schema.sql
</pre>

<p>
  Optional sample data:
</p>

<pre>
database/sample_data.sql
</pre>


<hr>


<h2>🚀 Run Backend</h2>

<p>
  From the backend directory:
</p>

<pre>
uvicorn main:app --reload
</pre>

<p>
  Backend API:
</p>

<pre>
http://127.0.0.1:8000
</pre>

<p>
  FastAPI Swagger Documentation:
</p>

<pre>
http://127.0.0.1:8000/docs
</pre>


<hr>


<h2>🌐 Run Frontend</h2>

<p>
  Open the <code>frontend</code> folder using VS Code.
</p>

<p>
  Start the project using the Live Server extension.
</p>

<p>
  Example:
</p>

<pre>
http://127.0.0.1:5500/login.html
</pre>


<hr>


<h2>📊 Major DBMS Concepts Used</h2>

<ul>
  <li>Relational database design</li>
  <li>Primary keys</li>
  <li>Foreign keys</li>
  <li>Unique constraints</li>
  <li>One-to-one relationships</li>
  <li>One-to-many relationships</li>
  <li>Many-to-many relationships</li>
  <li>SQL joins</li>
  <li>Aggregate queries</li>
  <li>Database transactions</li>
  <li>Commit and rollback</li>
  <li>Data integrity</li>
  <li>Role-based access control</li>
  <li>Branch-level data isolation</li>
  <li>Audit logging</li>
  <li>Financial transaction entries</li>
</ul>


<hr>


<h2>📷 Application Screenshots</h2>

<p>
  Screenshots can be stored inside:
</p>

<pre>
docs/screenshots/
</pre>

<p>
  Recommended screenshots:
</p>

<ul>
  <li>Registration page</li>
  <li>KYC submission page</li>
  <li>Customer dashboard</li>
  <li>Account Officer dashboard</li>
  <li>Loan Officer dashboard</li>
  <li>Branch Manager dashboard</li>
  <li>Admin dashboard</li>
  <li>Fund transfer</li>
  <li>Loan application</li>
  <li>Loan repayment</li>
  <li>Branch management</li>
  <li>Audit logs</li>
</ul>


<!--
Example screenshot usage:

<div align="center">

  <img
    src="docs/screenshots/customer-dashboard.png"
    width="850"
    alt="Nexa Bank Customer Dashboard"
  >

</div>
-->


<hr>


<h2>🎥 Video Demonstration</h2>


<p>
  <strong>Google Drive:</strong>
</p>

<pre>
Add your demonstration link here
</pre>


<hr>


<h2>🔎 Example Important SQL Query</h2>

<h3>Branch-Specific Loan Applications</h3>

<pre>
SELECT
    la.loan_application_id,
    la.customer_id,
    la.requested_amount,
    la.status,
    c.first_name,
    c.last_name,
    c.branch_id

FROM loan_applications la

JOIN customers c
    ON c.customer_id = la.customer_id

WHERE c.branch_id = %s

ORDER BY
    la.loan_application_id DESC;
</pre>

<p>
  This query ensures that a Loan Officer only receives loan applications
  belonging to customers from the officer's assigned branch.
</p>


<hr>


<h2>🔄 Complete System Flow</h2>

<pre>
USER REGISTRATION
        ↓
CUSTOMER ROLE ASSIGNED
        ↓
CUSTOMER APPLICATION
        ↓
ACCOUNT APPLICATION
        ↓
KYC SUBMISSION
        ↓
ACCOUNT OFFICER REVIEW
        ↓
KYC VERIFIED
        ↓
ACCOUNT APPROVED
        ↓
BANK ACCOUNT CREATED
        ↓
CUSTOMER BANKING SERVICES
        ↓
TRANSFER / BILL PAYMENT / FIXED DEPOSIT
        ↓
TRANSACTION HISTORY


CUSTOMER
        ↓
LOAN APPLICATION
        ↓
LOAN OFFICER REVIEW
        ↓
LOAN APPROVED
        ↓
LOAN CREATED
        ↓
LOAN DISBURSED
        ↓
ACTIVE LOAN
        ↓
INSTALLMENT REPAYMENT
        ↓
COMPLETED / DEFAULTED
</pre>


<hr>


<h2>⚠️ Current Limitations</h2>

<ul>
  <li>The project currently runs in a local development environment.</li>
  <li>Authentication is designed primarily for academic demonstration.</li>
  <li>No real banking network is connected.</li>
  <li>No real payment gateway is integrated.</li>
  <li>KYC documents are manually reviewed.</li>
  <li>No automated credit scoring system is implemented.</li>
  <li>No OTP or multi-factor authentication is currently available.</li>
  <li>No SMS or email provider is currently integrated.</li>
  <li>Multi-currency banking is not implemented.</li>
  <li>Real-time fraud detection is not implemented.</li>
</ul>


<hr>


<h2>🚧 Future Work</h2>

<ul>
  <li>JWT-based authentication</li>
  <li>Two-factor authentication</li>
  <li>OTP verification</li>
  <li>Email notifications</li>
  <li>SMS notifications</li>
  <li>Automated KYC verification</li>
  <li>Automated credit scoring</li>
  <li>Fraud detection</li>
  <li>Multi-currency support</li>
  <li>Mobile banking application</li>
  <li>ATM integration</li>
  <li>Debit and credit card processing</li>
  <li>Cheque management</li>
  <li>PDF bank statements</li>
  <li>Advanced branch analytics</li>
  <li>Advanced financial reports</li>
</ul>


<hr>


<h2>🔒 Security Notes</h2>

<p>
  For security reasons, the following files and information should never
  be committed to the public repository:
</p>

<ul>
  <li>Real database passwords</li>
  <li><code>.env</code> file</li>
  <li>Real customer NID information</li>
  <li>Real customer phone numbers</li>
  <li>Real banking credentials</li>
  <li>Production secrets</li>
</ul>


<hr>


<h2>🧪 Recommended Test Cases</h2>

<ul>
  <li>Duplicate username registration</li>
  <li>Duplicate email registration</li>
  <li>Invalid login</li>
  <li>KYC not verified before account approval</li>
  <li>Account Officer accessing another branch</li>
  <li>Loan Officer accessing another branch</li>
  <li>Insufficient balance during transfer</li>
  <li>Invalid beneficiary</li>
  <li>Duplicate loan creation</li>
  <li>Inactive account transaction</li>
  <li>Loan repayment with insufficient balance</li>
  <li>Rejected application without rejection reason</li>
</ul>


<hr>


<h2>👥 Authors</h2>

<table>
  <tr>
    <td>Wali Ullah Al Hafiz</td>
    <td>0112420067</td>
  </tr>

  <tr>
    <th>Md Tanvir Shahriar</th>
    <th>0112430730</th>
  </tr>

  <tr>
    <td>Israt Jahan</td>
    <td>0112430414</td>
  </tr>

  <tr>
    <td>Shafikul Islam Onik</td>
    <td>0112430490</td>
  </tr>
</table>


<hr>


<h2>🎓 Academic Information</h2>

<p>
  This project was developed for educational purposes as part of a
  Database Management Systems course.
</p>

<p>
  It demonstrates the design and implementation of a multi-user banking
  management system using a relational database.
</p>


<hr>


<h2>📜 License</h2>

<p>
  This project is intended primarily for academic and educational use.
</p>

<p>
  If an MIT License is included in the repository, the project may be used
  according to the terms of that license.
</p>


<hr>


<div align="center">

  <h3>🏦 Nexa Bank</h3>

  <p>
    <strong>
      Secure Banking • Structured Data • Role-Based Management
    </strong>
  </p>

  <p>
    Built as a DBMS academic project using
    FastAPI, MySQL, HTML, CSS and JavaScript.
  </p>

</div>
