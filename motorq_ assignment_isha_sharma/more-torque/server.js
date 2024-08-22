const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Placeholder for valid organizations (for demonstration purposes)
const validOrgs = new Set(["Hondaorg", "civichonda"]);

const cache = {}; // In-memory cache to store decoded VINs
const rateLimit = { count: 0, timestamp: Date.now() };

// In-memory storage for vehicles
const vehicles = {
  "1HGCM82633A123456": {
    vin: "1HGCM82633A123456",
    manufacturer: "Honda",
    model: "Accord",
    year: 2003,
    org: "Hondaorg",
  },
  "2HGCM82633A654321": {
    vin: "2HGCM82633A654321",
    manufacturer: "Honda",
    model: "Civic",
    year: 2004,
    org: "civichonda",
  },
};

// GET /vehicles/decode/:vin - Decodes VIN using NHTSA API and caches the result
app.get("/vehicles/decode/:vin", async (req, res) => {
  const vin = req.params.vin;

  // Validate VIN
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(vin)) {
    return res.status(400).json({ error: "Invalid VIN format" });
  }

  // Check the cache
  if (cache[vin]) {
    return res.status(200).json(cache[vin]);
  }

  // Rate limiting: allow only 5 requests per minute
  const currentTime = Date.now();
  if (currentTime - rateLimit.timestamp > 60000) {
    rateLimit.count = 0;
    rateLimit.timestamp = currentTime;
  }
  if (rateLimit.count >= 5) {
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Try again later." });
  }

  try {
    // Call NHTSA API to decode the VIN
    const response = await axios.get(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
    );

    const vehicleInfo = {
      manufacturer:
        response.data.Results.find(
          (item) => item.Variable === "Manufacturer Name"
        )?.Value || "Unknown",
      model:
        response.data.Results.find((item) => item.Variable === "Model")
          ?.Value || "Unknown",
      year:
        response.data.Results.find((item) => item.Variable === "Model Year")
          ?.Value || "Unknown",
    };

    // Store the result in the cache
    cache[vin] = vehicleInfo;
    rateLimit.count++;

    return res.status(200).json(vehicleInfo);
  } catch (error) {
    return res.status(500).json({ error: "Failed to decode VIN" });
  }
});

app.get("/vehicles/:vin", (req, res) => {
  const vin = req.params.vin;

  // Validate VIN
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(vin)) {
    return res.status(400).json({ error: "Invalid VIN format" });
  }

  // Check if the vehicle exists in our system
  const vehicle = vehicles[vin];
  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  // Return the vehicle details
  return res.status(200).json(vehicle);
});

app.post("/vehicles", async (req, res) => {
  const { vin, org } = req.body || {};

  console.log("VIN received:", vin); // Debugging line
  console.log("Organization received:", org); // Debugging line
  // Validate VIN and organization
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(vin)) {
    return res.status(400).json({ error: "Invalid VIN format" });
  }

  if (!validOrgs.has(org)) {
    return res.status(400).json({ error: "Invalid organization ID" });
  }

  // Check if the VIN is already in the system
  if (vehicles[vin]) {
    return res
      .status(400)
      .json({ error: "Vehicle already exists in the system" });
  }

  try {
    // Decode VIN using NHTSA API
    const response = await axios.get(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
    );
    const vehicleData = response.data;

    if (vehicleData.Results && vehicleData.Results.length > 0) {
      const vehicleInfo = {
        manufacturer:
          vehicleData.Results.find(
            (item) => item.Variable === "Manufacturer Name"
          )?.Value || "Unknown",
        model:
          vehicleData.Results.find((item) => item.Variable === "Model")
            ?.Value || "Unknown",
        year:
          vehicleData.Results.find((item) => item.Variable === "Model Year")
            ?.Value || "Unknown",
        org: org,
      };

      // Store the vehicle information
      vehicles[vin] = vehicleInfo;

      return res.status(201).json(vehicleInfo);
    } else {
      return res.status(404).json({ error: "Vehicle not found in NHTSA" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch vehicle data from NHTSA" });
  }
});

// In-memory storage for organizations (use a single data structure)
const organizations = {
  Org1: {
    name: "Org1",
    account: "acc1",
    website: "www.org1.com",
    fuelReimbursementPolicy: 1000,
    speedLimitPolicy: 25,
  },
  Org2: {
    name: "Org2",
    account: "acc2",
    website: "www.org2.com",
    fuelReimbursementPolicy: 1500,
    speedLimitPolicy: 30,
    parentOrgId: "Org1",
  },
};

// POST /Orgs - Create a new organization
app.post("/Orgs", (req, res) => {
  const { name, account, website, fuelReimbursementPolicy, speedLimitPolicy } =
    req.body;

  // Validate input
  if (!name || !account || !website) {
    return res
      .status(400)
      .json({ error: "Name, account, and website are required fields." });
  }

  if (
    typeof fuelReimbursementPolicy !== "undefined" &&
    typeof fuelReimbursementPolicy !== "number"
  ) {
    return res
      .status(400)
      .json({ error: "Fuel reimbursement policy must be a number." });
  }

  if (
    typeof speedLimitPolicy !== "undefined" &&
    typeof speedLimitPolicy !== "number"
  ) {
    return res
      .status(400)
      .json({ error: "Speed limit policy must be a number." });
  }

  // Default value for fuelReimbursementPolicy if not provided
  const orgFuelReimbursementPolicy = fuelReimbursementPolicy || 1000;

  // Create new organization
  const newOrg = {
    name,
    account,
    website,
    fuelReimbursementPolicy: orgFuelReimbursementPolicy,
    speedLimitPolicy,
  };

  // Store the organization
  organizations[name] = newOrg;

  // Return the created organization
  return res.status(201).json(newOrg);
});

// PATCH /orgs/:name - Update an existing organization's details
app.patch("/orgs/:name", (req, res) => {
  const orgName = req.params.name;
  const { account, website, fuelReimbursementPolicy, speedLimitPolicy } =
    req.body;

  // Check if the organization exists
  const org = organizations[orgName];
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }

  // Update the organization's details
  if (account) org.account = account;
  if (website) org.website = website;
  if (fuelReimbursementPolicy !== undefined)
    org.fuelReimbursementPolicy = fuelReimbursementPolicy;
  if (speedLimitPolicy !== undefined) org.speedLimitPolicy = speedLimitPolicy;

  return res.status(200).json({ message: "Organization updated", org });
});

// GET /orgs - Retrieve information about all organizations with pagination
app.get("/orgs", (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }

  const orgArray = Object.values(organizations);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = pageNum * limitNum;

  const paginatedOrgs = orgArray.slice(startIndex, endIndex);

  const result = paginatedOrgs.map((org) => {
    const parentOrg = organizations[org.parentOrgId];
    return {
      ...org,
      parentOrg: parentOrg ? parentOrg.name : null,
    };
  });

  res.status(200).json({
    totalOrgs: orgArray.length,
    page: pageNum,
    totalPages: Math.ceil(orgArray.length / limitNum),
    data: result,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
