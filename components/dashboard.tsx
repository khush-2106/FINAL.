"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Printer, Trash, Edit, Menu, Undo } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseconfig";

interface Order {
  id: string;
  client: string;
  manufacturer: string;
  product: string;
  quantity: number;
  status: string;
  date: string;
  timeline: { status: string; timestamp: string }[];
}

const orderStatuses = [
  "Order Received",
  "Retrieved from Manufacturer",
  "At Photography Studio",
  "Collected from Studio",
  "Returned to Manufacturer",
  "Pre Printing",
  "Printing",
  "Post Printing",
  "Photos Delivered",
] as const;
type OrderStatus = typeof orderStatuses[number];

export function DashboardComponent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrder, setNewOrder] = useState<Partial<Order> & { newClient?: string; newManufacturer?: string }>({
    client: "",
    manufacturer: "",
    quantity: 0,
  });
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [selectedChallanOrders, setSelectedChallanOrders] = useState<string[]>([]);
  const [challanType, setChallanType] = useState<string>("");
  const [photosDelivered, setPhotosDelivered] = useState<Record<string, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const querySnapshot = await getDocs(collection(db, "orders"));
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData as Order[]);
    };

    fetchOrders();
  }, []);

  const totalOrders = orders.length;
  const activeOrders = orders.filter(order => order.status !== "Photos Delivered").length;
  const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const handleAddOrder = async () => {
    setIsAddingOrder(true);
    const newId = `ORD${String(orders.length + 1).padStart(3, '0')}`;
    const orderToAdd: Order = {
      ...newOrder as Order,
      id: newId,
      product: "Sarees",
      status: "Order Received",
      date: new Date().toISOString().split('T')[0],
      timeline: [{ status: "Order Received", timestamp: new Date().toISOString() }]
    };

    try {
      await addDoc(collection(db, "orders"), orderToAdd);
      setOrders(prev => [orderToAdd, ...prev]);
      setNewOrder({ client: "", manufacturer: "", quantity: 0 });
      setIsAddingOrder(false);
      setIsDialogOpen(false);
      alert(`New order ${newId} has been added successfully.`);
    } catch (error) {
      console.error("Error adding order: ", error);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, "orders", orderId);
    const orderToUpdate = orders.find(order => order.id === orderId);
    if (orderToUpdate) {
      const updatedOrder = {
        ...orderToUpdate,
        status: newStatus,
        timeline: [...orderToUpdate.timeline, { status: newStatus, timestamp: new Date().toISOString() }]
      };
      await updateDoc(orderRef, updatedOrder);
      setOrders(prev => prev.map(order => order.id === orderId ? updatedOrder : order));
      alert(`Order ${orderId} status updated to ${newStatus}.`);
    }
  };

  const handleUndoStatus = async (orderId: string) => {
    const orderRef = doc(db, "orders", orderId);
    const orderToUpdate = orders.find(order => order.id === orderId);
    if (orderToUpdate && orderToUpdate.timeline.length > 1) {
      const updatedTimeline = orderToUpdate.timeline.slice(0, -1);
      const updatedStatus = updatedTimeline[updatedTimeline.length - 1].status;
      const updatedOrder = {
        ...orderToUpdate,
        status: updatedStatus,
        timeline: updatedTimeline
      };
      await updateDoc(orderRef, updatedOrder);
      setOrders(prev => prev.map(order => order.id === orderId ? updatedOrder : order));
      alert(`Order ${orderId} status reverted to ${updatedStatus}.`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const orderRef = doc(db, "orders", orderId);
    await deleteDoc(orderRef);
    setOrders(prev => prev.filter(order => order.id !== orderId));
    alert(`Order ${orderId} has been deleted.`);
  };

  const handleEditOrder = async (orderId: string, updatedOrder: Partial<Order>) => {
    const orderRef = doc(db, "orders", orderId);
    const orderToUpdate = orders.find(order => order.id === orderId);
    if (orderToUpdate) {
      const newOrderData = { ...orderToUpdate, ...updatedOrder };
      await updateDoc(orderRef, newOrderData);
      setOrders(prev => prev.map(order => order.id === orderId ? newOrderData : order));
      setIsDialogOpen(false);
      alert(`Order ${orderId} has been updated.`);
    }
  };

  const handleGenerateChallan = () => {
    if (!challanType || selectedChallanOrders.length === 0) {
      alert("Please select a challan type and at least one order.");
      return;
    }

    const challanContent = `
    <html>
      <head>
        <title>Challan - ${challanType}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .challan {
            page-break-after: always;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          h1, h2 {
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .signature {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature div {
            width: 200px;
            border-top: 1px solid black;
            padding-top: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        ${['Delivery Man', 'End Party'].map(party => `
          <div class="challan">
            <div class="header">
              <h1>PATEL OFFSET</h1>
              <h2>Challan - ${challanType} (${party} Copy)</h2>
            </div>
            <p>Date: ${format(new Date(), "PPpp")}</p>
            <table>
              <tr>
                <th>Order ID</th>
                <th>Client</th>
                <th>Manufacturer</th>
                <th>Product</th>
                <th>Quantity</th>
                ${challanType === "photos" ? "<th>Photos Delivered</th>" : ""}
              </tr>
              ${selectedChallanOrders.map(orderId => {
                const order = orders.find(o => o.id === orderId);
                return order ? `
                  <tr>
                    <td>${order.id}</td>
                    <td>${order.client}</td>
                    <td>${order.manufacturer}</td>
                    <td>${order.product}</td>
                    <td>${order.quantity}</td>
                    ${challanType === "photos" ? `<td>${photosDelivered[orderId] || 0}</td>` : ""}
                  </tr>
                ` : '';
              }).join('')}
            </table>
            <div class="signature">
              <div>Delivery Boy Signature</div>
              <div>End Party Signature</div>
            </div>
          </div>
        `).join('')}
    ...
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(challanContent);
      printWindow.document.close();
      printWindow.print();
    }

    alert(`${challanType} challan generated for ${selectedChallanOrders.length} orders.`);

    setChallanType("");
    setSelectedChallanOrders([]);
    setPhotosDelivered({});
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.date.includes(searchTerm)
  );

  const openNewOrderDialog = () => {
    setNewOrder({ client: "", manufacturer: "", quantity: 0 });
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">PATEL OFFSET</h1>
        <Button onClick={openNewOrderDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Order
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span>{status}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Order List</h2>
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {index === 0 || order.date !== filteredOrders[index - 1].date ? (
                  <Separator className="my-4" />
                ) : null}
                <Card className={`${order.status === "Photos Delivered" ? "opacity-50" : ""}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>{order.id} - {order.client}</CardTitle>
                      <CardDescription>{format(new Date(order.date), "MMMM d, yyyy")}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Menu className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => {
                          setNewOrder(order);
                          setIsDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Order
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteOrder(order.id)}>
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold">Manufacturer:</p>
                        <p>{order.manufacturer}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Product:</p>
                        <p>{order.product}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Quantity:</p>
                        <p>{order.quantity}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Status:</p>
                        <p>{order.status}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-4 overflow-x-auto">
                      {order.timeline.map((item, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === order.timeline.length - 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <p className="text-xs mt-1">{item.status}</p>
                          <p className="text-xs text-gray-500">{format(new Date(item.timestamp), "MMM d, HH:mm")}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-between">
                      <Button onClick={() => {
                        const currentIndex = orderStatuses.indexOf(order.status as OrderStatus);
                        if (currentIndex < orderStatuses.length - 1) {
                          handleUpdateStatus(order.id, orderStatuses[currentIndex + 1]);
                        }
                      }}>
                        Update Status
                      </Button>
                      <Button variant="outline" onClick={() => handleUndoStatus(order.id)}>
                        <Undo className="mr-2 h-4 w-4" />
                        Undo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </TabsContent>
        <TabsContent value="challans">
          <Card>
            <CardHeader>
              <CardTitle>Generate Challan</CardTitle>
              <CardDescription>Select challan type and orders to include</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={(value) => setChallanType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select challan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receiving">Receiving from Manufacturer</SelectItem>
                  <SelectItem value="delivering">Delivering to Manufacturer</SelectItem>
                  <SelectItem value="photos">Photos Delivered</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Label htmlFor="orders">Select Orders</Label>
                <Select
                  onValueChange={(value) => {
                    if (!selectedChallanOrders.includes(value)) {
                      setSelectedChallanOrders((prev) => [...prev, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select orders" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedChallanOrders.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Selected Orders:</h3>
                  <ul className="space-y-2">
                    {selectedChallanOrders.map((orderId) => (
                      <li key={orderId} className="flex items-center justify-between">
                        <span>{orderId}</span>
                        {challanType === "photos" && (
                          <Input
                            type="number"
                            placeholder="No. of photos"
                            className="w-24 mx-2"
                            value={photosDelivered[orderId] || ""}
                            onChange={(e) => setPhotosDelivered({
                              ...photosDelivered,
                              [orderId]: parseInt(e.target.value)
                            })}
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedChallanOrders(prev => prev.filter(id => id !== orderId))}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={handleGenerateChallan}>
                <Printer className="mr-2 h-4 w-4" />
                Generate and Print Challan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newOrder.id ? "Edit Order" : "Add New Order"}</DialogTitle>
            <DialogDescription>
              {newOrder.id ? "Edit the order details. Click save when you're done." : "Enter the details for the new order. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Select
                value={newOrder.client}
                onValueChange={(value) => setNewOrder({ ...newOrder, client: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Add New Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newOrder.client === "new" && (
              <div>
                <Label htmlFor="newClient">New Client</Label>
                <Input
                  id="newClient"
                  value={newOrder.newClient || ""}
                  onChange={(e) => setNewOrder({ ...newOrder, newClient: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Select
                value={newOrder.manufacturer}
                onValueChange={(value) => setNewOrder({ ...newOrder, manufacturer: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Add New Manufacturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newOrder.manufacturer === "new" && (
              <div>
                <Label htmlFor="newManufacturer">New Manufacturer</Label>
                <Input
                  id="newManufacturer"
                  value={newOrder.newManufacturer || ""}
                  onChange={(e) => setNewOrder({ ...newOrder, newManufacturer: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={newOrder.id ? () => handleEditOrder(newOrder.id!, newOrder) : handleAddOrder} disabled={isAddingOrder}>
              {isAddingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                newOrder.id ? "Save Changes" : "Save Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}