const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mysql = require("mysql");
const xlsx = require("xlsx");

app.use(bodyParser.json());

// MySQL Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Moin7396",
  database: "almeno",
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// Ingest Customer Data
function ingestCustomerData() {
  const workbook = xlsx.readFile("customer_data.xlsx");
  const customerSheet = workbook.Sheets["Sheet1"]; // Adjust sheet name if different
  const customerData = xlsx.utils.sheet_to_json(customerSheet);
  customerData.forEach((customer) => {
    console.log(customer);
    const customer_id = customer["Customer ID"];
    const first_name = customer["First Name"];
    const last_name = customer["Last Name"];
    const phone_number = customer["Phone Number"];
    const monthly_salary = customer["Monthly Salary"];
    const approved_limit = customer["Approved Limit"];
    const current_debt = customer["Current Debt"];
    const age = customer.Age;
    // Insert data into MySQL
    const query = `INSERT INTO customers (customer_id, first_name, last_name, phone_number, monthly_salary, approved_limit, current_debt,age) VALUES (?, ?, ?, ?, ?, ?, ?,?)`;
    connection.query(
      query,
      [
        customer_id,
        first_name,
        last_name,
        phone_number,
        monthly_salary,
        approved_limit,
        current_debt,
        age,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting customer data:", err);
        } else {
          console.log("Customer data inserted:", result);
        }
      }
    );
  });
}

function excelSerialNumberToDate(serial) {
  const baseDate = new Date("1899-12-30"); // Excel base date
  const millisecondsPerDay = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
  const daysSinceBaseDate = serial;
  const offsetMilliseconds = daysSinceBaseDate * millisecondsPerDay;
  return new Date(baseDate.getTime() + offsetMilliseconds);
}

// Ingest Loan Data
function ingestLoanData() {
  const workbook = xlsx.readFile("loan_data.xlsx");
  const loanSheet = workbook.Sheets["Sheet1"]; // Adjust sheet name if different

  const loanData = xlsx.utils.sheet_to_json(loanSheet);

  loanData.forEach((loan) => {
    console.log(loan);
    const customer_id = loan["Customer ID"];
    const loan_id = loan["Loan ID"];
    const loan_amount = loan["Loan Amount"];
    const tenure = loan.Tenure;
    const interest_rate = loan["Interest Rate"];
    const monthly_repayment = loan["Monthly payment"];
    const emis_paid_on_time = loan["EMIs paid on Time"];
    const start_date = excelSerialNumberToDate(loan["Date of Approval"]);
    const end_date = excelSerialNumberToDate(loan["End Date"]);
    // Insert data into MySQL
    const query = `INSERT INTO loans (customer_id, loan_id, loan_amount, tenure, interest_rate, monthly_repayment, emis_paid_on_time, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    connection.query(
      query,
      [
        customer_id,
        loan_id,
        loan_amount,
        tenure,
        interest_rate,
        monthly_repayment,
        emis_paid_on_time,
        start_date,
        end_date,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting loan data:", err);
        } else {
          console.log("Loan data inserted:", result);
        }
      }
    );
  });
}

function calculatecreditscore(loandata, loan_amount) {
  let credit_score = 0;
  let current_date = new Date();
  let loans_present = 0;
  let current_debt = 0;
  let completed_emis = 0;

  for (i of loandata) {
    if (i.tenure == i.emis_paid_on_time) {
      completed_emis += 1;
    }
    let loan_enddate = new Date(i.end_date);
    if (current_date < loan_enddate) {
      loans_present += 1;
      current_debt += (i.tenure - i.emis_paid_on_time) * i.monthly_repayment;
    }
  }

  credit_score += (completed_emis / loandata.length) * 50;
  credit_score += loans_present * 5;
  if (current_debt <= loan_amount) {
    credit_score += 20;
  } else {
    credit_score = 0;
  }

  return credit_score;
}

function calculateEMI(principal, annualInterestRate, tenureMonths) {
  // Convert annual interest rate to monthly interest rate
  const monthlyInterestRate = annualInterestRate / 12 / 100;

  // Calculate EMI
  const emi =
    (principal *
      monthlyInterestRate *
      Math.pow(1 + monthlyInterestRate, tenureMonths)) /
    (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1);

  return Math.round(emi);
}

function getenddate(numMonths) {
  // Get the current date
  const currentDate = new Date();

  // Calculate the future date by adding the number of months
  const futureDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + numMonths,
    currentDate.getDate()
  );

  // Return the future date
  return futureDate;
}

app.post("/ingestdata", (req, res) => {
  try {
    ingestCustomerData();
    ingestLoanData();
    res.status(200).json({ message: "excel data ingested" });
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/register", (req, res) => {
  try {
    const { first_name, last_name, age, monthly_income, phone_number } =
      req.body;

    const approved_limit = Math.round(36 * monthly_income);
    const customer_id = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    console.log(customer_id, approved_limit);
    const query = `INSERT INTO customers (customer_id, first_name, last_name, phone_number, monthly_salary, approved_limit,age) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    connection.query(
      query,
      [
        customer_id,
        first_name,
        last_name,
        phone_number,
        monthly_income,
        approved_limit,
        age,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting customer data:", err);
        } else {
          console.log("Customer data inserted:", result);
        }
      }
    );
    res.status(200).json({
      customer_id: customer_id,
      name: first_name + last_name,
      age: age,
      monthly_income: monthly_income,
      approved_limit: approved_limit,
      phone_number: phone_number,
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/check-eligibilty", (req, res) => {
  try {
    let { customer_id, loan_amount, interest_rate, tenure } = req.body;
    let credit_score = 0;
    let loan_eligibility = false;
    let corrected_interestrate = 0;

    let emi = 0;
    let loan_data;
    const query = `SELECT * FROM loans WHERE customer_id=${customer_id}`;
    connection.query(query, (err, result) => {
      if (err) {
        console.error("Error inserting customer data:", err);
      } else {
        console.log("Customer data inserted:", result);
        console.log(result[0].emis_paid_on_time);
        credit_score = calculatecreditscore(result, loan_amount);
        console.log(credit_score);
        if (credit_score > 50) loan_eligibility = true;
        if (credit_score > 30) {
          loan_eligibility = true;
          corrected_interestrate = 13;
        }
        if (30 > credit_score > 10) {
          loan_eligibility = true;
          corrected_interestrate = 17;
        }
        if (10 > credit_score) loan_eligibility = false;
        if (loan_eligibility == true && corrected_interestrate == 0) {
          emi = calculateEMI(loan_amount, interest_rate, tenure);
        }
        if (loan_eligibility == true && corrected_interestrate != 0) {
          emi = calculateEMI(loan_amount, corrected_interestrate, tenure);
        }
        console.log(emi);
        res.status(200).json({
          customer_id: customer_id,
          approval: loan_eligibility,
          interest_rate: interest_rate,
          corrected_interestrate: corrected_interestrate,
          tenure: tenure,
          monthly_installment: emi,
        });
      }
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/create-loan", (req, res) => {
  try {
    let { customer_id, loan_amount, interest_rate, tenure } = req.body;
    let credit_score = 0;
    let loan_eligibility = false;
    let corrected_interestrate = 0;

    let emi = 0;
    let loan_data;
    const query = `SELECT * FROM loans WHERE customer_id=${customer_id}`;
    connection.query(query, (err, result) => {
      if (err) {
        console.error("Error inserting customer data:", err);
      } else {
        console.log("Customer data inserted:", result);
        console.log(result[0].emis_paid_on_time);
        credit_score = calculatecreditscore(result, loan_amount);
        console.log(credit_score);
        if (credit_score > 50) loan_eligibility = true;
        if (credit_score > 30) {
          loan_eligibility = true;
          corrected_interestrate = 13;
        }
        if (30 > credit_score > 10) {
          loan_eligibility = true;
          corrected_interestrate = 17;
        }
        if (10 > credit_score) loan_eligibility = false;
        if (loan_eligibility == true && corrected_interestrate == 0) {
          emi = calculateEMI(loan_amount, interest_rate, tenure);
        }
        if (loan_eligibility == true && corrected_interestrate != 0) {
          emi = calculateEMI(loan_amount, corrected_interestrate, tenure);
        }
        console.log(emi);
        if (loan_eligibility == true) {
          const loan_id = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
          const start_date = new Date();
          const end_date = getenddate(tenure);
          if (corrected_interestrate != 0) {
            interest_rate = corrected_interestrate;
          }
          const query = `INSERT INTO loans (customer_id, loan_id, loan_amount, tenure, interest_rate, monthly_repayment, emis_paid_on_time, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          connection.query(
            query,
            [
              customer_id,
              loan_id,
              loan_amount,
              tenure,
              interest_rate,
              emi,
              0,
              start_date,
              end_date,
            ],
            (err, result) => {
              if (err) {
                console.error("Error inserting loan data:", err);
              } else {
                console.log("Loan data inserted:", result);

                res.status(200).json({
                  loan_id: loan_id,
                  customer_id: customer_id,
                  loan_approved: loan_eligibility,
                  monthly_installment: emi,
                });
              }
            }
          );
        } else {
          res.status(200).json({
            customer_id: customer_id,
            loan_approved: loan_eligibility,
            message: "Due to Low credit score",
          });
        }
      }
    });
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/view-loan/loan-id", (req, res) => {
  try {
    let { loan_id } = req.body;
    const query = `SELECT * FROM loans WHERE loan_id=${loan_id}`;
    connection.query(query, (error, result) => {
      if (error) {
        console.log(error);
      } else {
        console.log(result);
        res.status(200).json({
          loan_id: loan_id,
          customer_id: result[0].customer_id,
          loan_amount: result[0].loan_amount,
          interest_rate: result[0].interest_rate,
          monthly_installment: result[0].monthly_repayment,
          tenure: result[0].tenure,
        });
      }
    });
  } catch (err) {
    console.log(err.message);
  }
});

app.post("/make-payment/customer_id/loan-id", (req, res) => {
  try {
    let { customer_id, loan_id, amount } = req.body;
    const query = `SELECT * FROM loans WHERE loan_id=${loan_id}`;
    connection.query(query, (error, result) => {
      if (error) {
        console.log(error);
      } else {
        console.log(result);
        let newemi = 0;
        if (amount > result[0].monthly_repayment) {
          newemi =
            ((result[0].tenure - result[0].emis_paid_on_time) *
              result[0].monthly_repayment -
              amount) /
            (result[0].tenure - result[0].emis_paid_on_time - 1);
          let query = `UPDATE loans set monthly_repayment=${newemi},emis_paid_on_time=${result[0].emis_paid_on_time + 1
            } where loan_id=${loan_id}`;
          connection.query(query, (error, result) => {
            if (error) {
              console.log(error);
            } else {
              console.log(result);
            }
          });
          res.status(200).json({ message: `Payment Done.New emi ${newemi}` });
        }
        if (amount < result[0].monthly_repayment) {
          res.status(200).json({ message: "insufficient amount" });
        }
        if (amount == result[0].monthly_repayment) {
          let query = `UPDATE loans set emis_paid_on_time=${result[0].emis_paid_on_time + 1
            } where loan_id=${loan_id}`;
          connection.query(query, (error, result) => {
            if (error) {
              console.log(error);
            } else {
              console.log(result);
            }
          });
          res.status(200).json({ message: "Payment done" });
        }
      }
    });
  } catch (error) {
    console.log(error.message);
  }
});
app.post("/view-statement/customer_id/loan_id", (req, res) => {
  try {
    let { customer_id, loan_id } = req.body;
    let query = `select *from loans where customer_id=${customer_id}`;
    connection.query(query, (error, result) => {
      if (error) {
        console.log(error);
      } else {
        let loanlist = [];
        for (i of result) {
          loanlist.push({
            loan_id: `${i.loan_id}`,
            customer_id: `${i.customer_id}`,
            loan_amount: `${i.loan_amount}`,
            interest_rate: `${i.interest_rate}`,
            amount_paid: `${i.emis_paid_on_time * i.monthly_repayment}`,
            monthly_installment: `${i.monthly_repayment}`,
            repayments_left: `${i.tenure - i.emis_paid_on_time}`,
          });
        }
        res.status(200).json({ loans: loanlist });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

app.listen("9000", () => {
  console.log("listening");
});
