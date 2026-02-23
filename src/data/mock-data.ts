import { WaitlistEntry, TableInfo } from "@/types/dashboard";

export const initialWaitlist: WaitlistEntry[] = [
  {
    id: "w1",
    guestName: "Anderson Family",
    partySize: 4,
    phone: "(415) 555-0192",
    addedAt: new Date(Date.now() - 42 * 60000),
    status: "waiting",
  },
  {
    id: "w2",
    guestName: "Chen, Margaret",
    partySize: 2,
    phone: "(628) 555-0347",
    addedAt: new Date(Date.now() - 28 * 60000),
    status: "waiting",
  },
  {
    id: "w3",
    guestName: "Rodriguez Party",
    partySize: 6,
    phone: "(510) 555-0821",
    addedAt: new Date(Date.now() - 22 * 60000),
    status: "waiting",
  },
  {
    id: "w4",
    guestName: "Nakamura, Yuki",
    partySize: 2,
    phone: "(415) 555-0654",
    addedAt: new Date(Date.now() - 15 * 60000),
    status: "waiting",
  },
  {
    id: "w5",
    guestName: "Williams, James",
    partySize: 3,
    phone: "(650) 555-0983",
    addedAt: new Date(Date.now() - 10 * 60000),
    status: "waiting",
  },
  {
    id: "w6",
    guestName: "Patel Anniversary",
    partySize: 8,
    phone: "(408) 555-0276",
    addedAt: new Date(Date.now() - 7 * 60000),
    status: "waiting",
  },
  {
    id: "w7",
    guestName: "O'Brien, Sarah",
    partySize: 2,
    phone: "(925) 555-0412",
    addedAt: new Date(Date.now() - 3 * 60000),
    status: "waiting",
  },
];

export const initialTables: TableInfo[] = [
  { id: "t1", tableNumber: 1, capacity: 2, status: "occupied", seatedAt: new Date(Date.now() - 42 * 60000), guestName: "Kim, David", partySize: 2 },
  { id: "t2", tableNumber: 2, capacity: 2, status: "available" },
  { id: "t3", tableNumber: 3, capacity: 4, status: "occupied", seatedAt: new Date(Date.now() - 25 * 60000), guestName: "Thompson", partySize: 3 },
  { id: "t4", tableNumber: 4, capacity: 4, status: "available" },
  { id: "t5", tableNumber: 5, capacity: 6, status: "occupied", seatedAt: new Date(Date.now() - 60 * 60000), guestName: "Davis Party", partySize: 5 },
  { id: "t6", tableNumber: 6, capacity: 2, status: "available" },
  { id: "t7", tableNumber: 7, capacity: 4, status: "reserved" },
  { id: "t8", tableNumber: 8, capacity: 8, status: "available" },
  { id: "t9", tableNumber: 9, capacity: 2, status: "occupied", seatedAt: new Date(Date.now() - 15 * 60000), guestName: "Lee, Jessica", partySize: 2 },
  { id: "t10", tableNumber: 10, capacity: 4, status: "available" },
  { id: "t11", tableNumber: 11, capacity: 6, status: "occupied", seatedAt: new Date(Date.now() - 35 * 60000), guestName: "Martinez Family", partySize: 6 },
  { id: "t12", tableNumber: 12, capacity: 2, status: "available" },
];

