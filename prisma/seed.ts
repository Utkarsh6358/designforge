import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER = {
  name: "Demo User",
  email: "demo@lldpractice.com",
};

const PROBLEMS = [
  {
    title: "Parking Lot System",
    slug: "parking-lot",
    description:
      "Design a parking lot system that can manage vehicles of different sizes, track available spots, and handle entry/exit with fee calculation. The system should support multiple floors and different vehicle types.",
    requirements: JSON.stringify([
      "Support multiple vehicle types: car, motorcycle, truck",
      "Multiple floors with numbered spots of different sizes",
      "Track available spots per floor and per vehicle type",
      "Vehicle entry: assign nearest available spot of appropriate size",
      "Vehicle exit: calculate fee based on duration and vehicle type",
      "Display available spot count per floor",
      "Handle full parking lot (reject entry)",
    ]),
    constraints: JSON.stringify([
      "Single entry/exit point per floor (MVP)",
      "Fee calculation: flat hourly rate, different per vehicle type",
      "No reservation system (MVP)",
      "Single currency",
    ]),
    difficulty: "Easy",
    rubric: {
      dimensions: JSON.stringify([
        {
          name: "Responsibility Clarity",
          description:
            "Each class has a single, well-defined responsibility. ParkingLot, Floor, Spot, Vehicle, and FeeCalculator are distinct.",
          weight: 25,
          maxScore: 10,
        },
        {
          name: "Vehicle Type Polymorphism",
          description:
            "Vehicle types handled via polymorphism/strategy, not if-else chains. New vehicle types can be added without modifying existing code.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Encapsulation & Information Hiding",
          description:
            "Internal state (spots, floors) is hidden behind well-defined interfaces. Spot allocation logic is encapsulated.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Extensibility & OCP",
          description:
            "Design supports adding new vehicle types, fee strategies, or floor types without modifying existing classes.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Edge Case Awareness",
          description:
            "Handles full lot, invalid vehicle type, double-exit, and concurrent entry/exit scenarios.",
          weight: 15,
          maxScore: 10,
        },
      ]),
    },
  },
  {
    title: "Vending Machine",
    slug: "vending-machine",
    description:
      "Design a vending machine system that manages product inventory, accepts payments, dispenses products, and returns change. The system should handle different product types and payment methods.",
    requirements: JSON.stringify([
      "Display available products with prices and quantities",
      "Accept coin/cash payments (multiple denominations)",
      "Select a product by code",
      "Dispense product if sufficient payment and in stock",
      "Return correct change using available denominations",
      "Handle out-of-stock products",
      "Admin: restock products and collect cash",
    ]),
    constraints: JSON.stringify([
      "Single vending machine (not networked)",
      "Cash/coin only (no card payments in MVP)",
      "Fixed set of denominations",
      "Sequential operations (one customer at a time)",
    ]),
    difficulty: "Easy",
    rubric: {
      dimensions: JSON.stringify([
        {
          name: "State Machine Design",
          description:
            "Vending machine states (Idle, HasMoney, Dispensing, etc.) are explicitly modeled. Transitions are clear and valid.",
          weight: 25,
          maxScore: 10,
        },
        {
          name: "Responsibility Clarity",
          description:
            "Separation between VendingMachine, Inventory, PaymentProcessor, ChangeCalculator, and Product.",
          weight: 25,
          maxScore: 10,
        },
        {
          name: "Encapsulation & Information Hiding",
          description:
            "Internal cash register, inventory state, and change calculation logic are properly encapsulated.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Extensibility & OCP",
          description:
            "Design supports adding new payment methods or product types without modifying the core machine logic.",
          weight: 15,
          maxScore: 10,
        },
        {
          name: "Edge Case Awareness",
          description:
            "Handles insufficient payment, exact change, out-of-stock, and cannot-make-change scenarios.",
          weight: 15,
          maxScore: 10,
        },
      ]),
    },
  },
  {
    title: "Elevator System",
    slug: "elevator-system",
    description:
      "Design an elevator system for a building with multiple elevators. The system should handle floor requests, optimize elevator assignment, and manage direction/movement efficiently.",
    requirements: JSON.stringify([
      "Support multiple elevators in a building",
      "Handle both external requests (floor button) and internal requests (cabin button)",
      "Assign optimal elevator to external requests (minimize wait time)",
      "Elevator moves in current direction, serving requests along the way (SCAN/LOOK algorithm)",
      "Display current floor and direction for each elevator",
      "Handle door open/close with timing",
      "Emergency stop functionality",
    ]),
    constraints: JSON.stringify([
      "Fixed number of floors and elevators (configured at startup)",
      "Single building",
      "No weight/capacity limit (MVP)",
      "No priority/express elevator (MVP)",
    ]),
    difficulty: "Medium",
    rubric: {
      dimensions: JSON.stringify([
        {
          name: "Responsibility Clarity",
          description:
            "Clear separation: Building, ElevatorController, Elevator, Request, Door, and SchedulingStrategy are distinct classes.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Scheduling Strategy",
          description:
            "Elevator assignment uses a well-defined strategy (SCAN, LOOK, shortest-seek). Strategy is abstracted and swappable.",
          weight: 25,
          maxScore: 10,
        },
        {
          name: "State Machine Design",
          description:
            "Elevator states (Idle, MovingUp, MovingDown, DoorOpen) are explicitly modeled with valid transitions.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Extensibility & OCP",
          description:
            "Design supports adding new scheduling algorithms, elevator types, or priority schemes without modifying core logic.",
          weight: 20,
          maxScore: 10,
        },
        {
          name: "Concurrency Awareness",
          description:
            "Acknowledges concurrent requests and race conditions. Thread safety considerations are mentioned.",
          weight: 15,
          maxScore: 10,
        },
      ]),
    },
  },
];

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: DEMO_USER,
  });
  console.log(`Created user: ${user.name} (${user.email})`);

  // Create problems with rubrics
  for (const problemData of PROBLEMS) {
    const { rubric, ...problem } = problemData;

    const created = await prisma.problem.upsert({
      where: { slug: problem.slug },
      update: problem,
      create: problem,
    });

    await prisma.rubric.upsert({
      where: { problemId: created.id },
      update: { dimensions: rubric.dimensions },
      create: {
        problemId: created.id,
        dimensions: rubric.dimensions,
      },
    });

    console.log(`Created problem: ${created.title} (${created.difficulty})`);
  }

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
