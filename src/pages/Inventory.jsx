import React, { useState, useEffect } from "react";
import AddIcon from '@mui/icons-material/Add';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Toolbar, Container, Typography } from "@mui/material";
import axios from "axios";
import AddItemModal from "../page-overlay/AddItemModal";
import OverlayItem from '../page-overlay/OverlayItem';

export default function Inventory( { user, setUser, setSnackbarGreenOpen, setSnackbarRedOpen, setSnackbarMessage } ) {
	const [id, setId] = useState("");
	const [queryResults, setQueryResults] = useState([]);
	const [LqueryResults, setLQueryResults] = useState([]);
	const columns = ["PROPERTY TAG", "ACCOUNTABLE PERSON", "DESIGNATION", "DEPARTMENT", "INVOICE NUMBER", "INVOICE DATE", "ISSUE ORDER NUMBER", "QUANTITY", "REMARKS", "STATUS", "SUPPLIER", "TOTAL COST", "UNIT COST", "UNIT OF MEASURE", "LIFESPAN"];
	
	const address = getIpAddress();
	
	function getIpAddress() {
		const hostname = window.location.hostname;

		const indexOfColon = hostname.indexOf(':');

		if(indexOfColon !== -1) {
			return hostname.substring(0, indexOfColon);
		}

		return hostname;
	}

	const [openDialog, setOpenDialog] = useState(false);
	const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

	const [formData, setFormData] = useState({
		accPerson: "",
		department: "",
		designation: "",
		invoiceNumber: "",
		invoiceDate: "",
		issueOrder: "",
		lifespan: "",
		quantity: "",
		remarks: "",
		status: "",
		supplier: "",
		totalCost: "",
		unitCost: "",
		unitOfMeasurement: "",
		description: {
			name: "",
			model: "",
			serialNumber: "",
			type: "",
			other: "",
		},
		location: {
			building: "",
			room: "",
		},
	});

	const formatNumber = (num) => {
		if (!num) return '';
		const [whole, decimal] = num.toString().split('.');
		return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimal ? '.' + decimal : '');
	  };
	  
	  const handleChange = (event) => {
		const { name, value } = event.target;
	  
		// Check if the field being changed is quantity or unitCost
		if (name === "quantity" || name === "unitCost") {
		  // Remove commas for raw value calculations
		  const rawValue = value.replace(/,/g, '');
	  
		  // Calculate total cost using raw values
		  const quantity = name === "quantity" ? rawValue : formData.quantity;
		  const unitCost = name === "unitCost" ? rawValue : formData.unitCost;
		  const totalCost = parseFloat(quantity) * parseFloat(unitCost);
	  
		  // Update state for quantity or unitCost only
		  setFormData((prevState) => ({
			...prevState,
			[name]: rawValue, // Store raw value for calculations
			totalCost: totalCost ? totalCost.toFixed(2) : "0.00", // Ensure two decimal places
		  }));
		} else if (name.includes(".")) {
		  // Handle nested fields (parent.child)
		  const [parentKey, childKey] = name.split(".");
		  setFormData((prevState) => ({
			...prevState,
			[parentKey]: {
			  ...prevState[parentKey],
			  [childKey]: value,
			},
		  }));
		} else {
		  // Update other fields normally
		  setFormData((prevState) => ({
			...prevState,
			[name]: value,
		  }));
		}
	  };
	  
	const handleSubmit = () => {
		const totalCost = parseFloat(formData.quantity) * parseFloat(formData.unitCost);
	
		axios.post(`http://${address}:8080/item/insertItem?fullName=${formData.accPerson}`, {
			department: formData.department,
			designation: formData.designation,
			invoiceNumber: formData.invoiceNumber,
			invoiceDate: formData.invoiceDate,
			issueOrder: formData.issueOrder,
			lifespan: formData.lifespan,
			quantity: formData.quantity,
			remarks: formData.remarks,
			status: (formData.accPerson && formData.department && formData.designation) ? "WAITING" : "TO BE ASSIGNED",
			supplier: formData.supplier,
			totalCost: totalCost,
			unitCost: formData.unitCost,
			unitOfMeasurement: formData.unitOfMeasurement,
			description: {
				name: formData.description.name,
				model: formData.description.model,
				serialNumber: formData.description.serialNumber,
				type: formData.description.type,
				other: formData.description.other,
			},
			location: {
				building: formData.location.building,
				room: formData.location.room,
			},
		})
		.then(response => {
			const newId = response.data.iid;
			const newName = response.data.description.name; 
			setQueryResults(response.data);
			setId(newId);
			
			if(response.data.status !== "WAITING") {
				setSnackbarMessage("Data added!");
				setSnackbarGreenOpen(true);
			}	

			console.log("Data added!");
			console.log("New item ID:", newId); 
			console.log(response.data);

			if(response.data.status === "WAITING") {
				axios.post(`http://${address}:8080/request/add`, {}, {
					params: {
						iid: newId,
					}
				}).then(response => {
					console.log(response.data);
					setSnackbarMessage("Request sent!");
					setSnackbarGreenOpen(true);
				}).catch(error => {
					console.error("Error sending request:", error);
				});
			}

			axios.post(`http://${address}:8080/addLog`, {
				description: `Added an Item: [${newId}] - ${newName}`,
				type: "ADD"
			}, {
				params: {
					uid: user.uid,
					iid: newId 
				}
			})
			.then(response => {
				setLQueryResults(response.data);
				setShowAddItemModal(false);
				setLoader(Math.random()*1000);
			})
			.catch(error => {
				console.error("Error adding log:", error);
			});

			setFormData({
				accPerson: "",
				department: "",
				designation: "",
				invoiceNumber: "",
				invoiceDate: "",
				issueOrder: "",
				lifespan: "",
				quantity: "",
				remarks: "",
				status: "",
				supplier: "",
				totalCost: "",
				unitCost: "",
				unitOfMeasurement: "",
				description: {
					name: "",
					model: "",
					serialNumber: "",
					type: "",
					other: "",
				},
				location: {
					building: "",
					room: "",
				},
			});
		})
		.catch(error => {
			console.error("Error inserting data:", error);
			console.log(formData.invoiceDate);
			console.log(typeof formData.invoiceDate);
		});
	};

	const combinedSubmit = (event) => {
		event.preventDefault(); // Prevent default form submission
		handleSubmit();
	}

	const [data, setData] = useState([]);
	const [selectedItem, setSelectedItem] = useState({}); // Initialize with an empty object
	const [showOverlay, setShowOverlay] = useState(false);
	const [showAddItemModal, setShowAddItemModal] = useState(false);
	const [loader, setLoader] = useState(null);

	const handleOpenModal = () => setShowAddItemModal(true);
	const handleCloseModal = () => setShowAddItemModal(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await axios.get(
					`http://${address}:8080/item/getAllItems`
				);
				setData(response.data);
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};

		fetchData();
	}, [loader]);

	const handleRowClick = (item) => {
		setSelectedItem(item);
		setShowOverlay(true); // Show overlay after clicking on a row
	};

    const handleDelete = (event) => {
		event.preventDefault();
		const itemId = selectedItem.iid;
		if (!itemId) {
		  console.error('No item ID found to delete');
		  return;
		}
	
		axios.delete(`http://${address}:8080/item/deleteItem/${itemId}`)
		.then(response => {
			if (response.status === 200) {

			axios.post(`http://${address}:8080/addLog`, {
				type: "DELETE",
				description: `Deleted an Item: [${selectedItem.iid}] - ${selectedItem.description.name}`
			}, {
				params: {
					uid: user.uid,
					iid: itemId
				}
			})
			.then(response => {
				console.log(response.data);
				
			})
			.catch(error => {
				console.error("Error adding log:", error);
			});
			
			console.log('Item deleted successfully');
			// alert("Item Deleted");
			// setSnackbarMessage("Item deleted!");
			// setSnackbarGreenOpen(true);
			setLoader(Math.random()*1000);
			handleCloseDialog();
			handleCloseOverlay();
			
			} else {
			console.error('Failed to delete item');
			}
		})
		.catch(error => {
			console.error('Error occurred during deletion:', error);
		});
	  };


	  const [updated, setUpdated] = useState(null); 

	  const handleUpdate = async (event) => {
		event.preventDefault();
	
		try {
			if (selectedItem) {

				const status = (selectedItem.accPerson && selectedItem.department && selectedItem.designation) 
                ? "WAITING" 
                : "TO BE ASSIGNED";

				const fullName = selectedItem.accPerson.fname + " " + selectedItem.accPerson.lname;

				const updatedItem = {
					...selectedItem,
					accPerson: null,
					status: status,
				};

				const url = `http://${address}:8080/item/updateItem/${selectedItem.iid}?fullName=${fullName}`;
				await axios.put(url, updatedItem);

				if(updatedItem.status === "WAITING") {
					axios.post(`http://${address}:8080/request/add`, {}, {
						params: {
							iid: selectedItem.iid,
						}
					}).then(response => {
						console.log(response.data);
					}).catch(error => {
						console.error("Error sending request:", error);
					});
				}
				// alert("Data updated");
				// setSnackbarMessage("Data updated!");
				// setSnackbarGreenOpen(true);
				// console.log("Item updated successfully");
	
				// Get the original item from the data or wherever it is stored
				const originalItem = data.find(item => item.iid === selectedItem.iid);
	
				// Compare each property to find changes
				const changedProperties = [];
				for (const key in selectedItem) {
					if (selectedItem.hasOwnProperty(key) && selectedItem[key] !== originalItem[key]) {
						changedProperties.push(key);
					}
				}

				// Construct description based on changed properties
				let description;
				if (changedProperties.length > 0) {
					description = "Updated " + changedProperties.join(", ") + ` of: [${selectedItem.iid}] - ${selectedItem.description.name}`;
				} else {
					description = "Updated nothing";
				}
	
				await axios.post(`http://${address}:8080/addLog`, {
					type: "UPDATE",
					description: description
				}, {
					params: {
						uid: user.uid,
						iid: selectedItem.iid
					}
				})
				.then(response => {
					console.log("Log added successfully:", response.data);
				})
				.catch(error => {
					console.error("Error adding log:", error);
				});
	
				setShowOverlay(false);
				const response = await axios.get(
					`http://${address}:8080/item/getAllItems`
				);
				setData(response.data);
	
				setUpdated(selectedItem);
			}
		} catch (error) {
			console.error("Error updating item:", error);
		}
	};
	
	const handleCloseOverlay = () => {
		setShowOverlay(false);
		setSelectedItem({}); // Reset selectedItem to an empty object
	};

	const handleQuantityChange = (e) => {
		const quantity = e.target.value;
		const unitCost = selectedItem.unitCost || 0; // Handle cases where unitCost is not set
		const totalCost = quantity * unitCost;
		setSelectedItem({ ...selectedItem, quantity, totalCost });
	};

	const handleUnitCostChange = (e) => {
		const value = e.target.value.replace(/,/g, ''); // Remove commas for calculation
		const unitCost = value;
		const quantity = selectedItem.quantity || 0; // Handle cases where quantity is not set
		const totalCost = quantity * (unitCost ? parseFloat(unitCost) : 0);
		
		setSelectedItem({ ...selectedItem, unitCost, totalCost });
	};
	

    return(
      <>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
		<Toolbar />
		<Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
		<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
		<Button
			type="button"
			variant="contained"
			sx={{ borderRadius: 2, fontFamily: "Poppins", backgroundColor: '#8c383e',   
			color: '#fafafa', 
			'&:hover': {
			backgroundColor: 'darkred', 
		}, }}
			onClick={handleOpenModal}
			startIcon={<AddIcon />}
		>
			<span
				style={{
				position: "relative",
				right: "5px",
				top: "0.5px",
					}}
				>
				
				</span>
			Add Item
		</Button>
		</div>
				
		<TableContainer component={Paper} style={{ maxHeight: '530px', marginLeft: '1px', marginRight: '4px', marginTop: '20px' }}>
			<Table size="small" stickyHeader aria-label="customized table">
			<TableHead>
				<TableRow style={{ position: 'sticky', top: 0, backgroundColor: '#eeeeee', zIndex: 1 }}>
				{columns.map((column) => (
					<TableCell
					key={column}
					style={{ padding: '10px', fontWeight: '600', color: 'black', backgroundColor: '#eeeeee' }}
					>
					{column}
					</TableCell>
				))}
				</TableRow>
			</TableHead>
			<TableBody>
				{data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                    <Typography variant="body1">There are no item(s) to show</Typography>
                  </TableCell>
                </TableRow>
              ) : (data.map((item) => (
				!item.deleted && (
					<TableRow
					key={item.iid}
					onClick={() => handleRowClick(item)}
					style={{
						backgroundColor: 'white',
						transition: 'background-color 0.3s ease',
					}}
					onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'gray'}
					onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
					>
					<TableCell>{item.iid}</TableCell>
					<TableCell>{item.accPerson ? `${item.accPerson.fname} ${item.accPerson.lname}` : ""}</TableCell>
					<TableCell>{item.designation}</TableCell>
					<TableCell>{item.department}</TableCell>
					<TableCell>{item.invoiceNumber}</TableCell>
					<TableCell>{item.invoiceDate}</TableCell>
					<TableCell>{item.issueOrder}</TableCell>
					<TableCell>{item.quantity}</TableCell>
					<TableCell>{item.remarks}</TableCell>
					<TableCell>{item.status}</TableCell>
					<TableCell>{item.supplier}</TableCell>
					<TableCell>₱{item.totalCost.toLocaleString()}</TableCell>
					<TableCell>₱{item.unitCost.toLocaleString()}</TableCell>
					<TableCell>{item.unitOfMeasurement}</TableCell>
					<TableCell>{item.lifespan}</TableCell>
					</TableRow>
				)
				))
			)}
			</TableBody>
			</Table>
		</TableContainer>

		<AddItemModal
				showAddItemModal={showAddItemModal}
				handleCloseModal={handleCloseModal}
				formData={formData}
				handleChange={handleChange}
				combinedSubmit={combinedSubmit}
				formatNumber={formatNumber}
		/>
		<Button onClick={() => handleRowClick(item)}></Button>
		<OverlayItem
			showOverlay={showOverlay}
			selectedItem={selectedItem}
			setSelectedItem={setSelectedItem}
			handleUpdate={handleUpdate}
			handleQuantityChange={handleQuantityChange}
			handleUnitCostChange={handleUnitCostChange}
			handleCloseOverlay={handleCloseOverlay}
			handleOpenDialog={handleOpenDialog}
			handleCloseDialog={handleCloseDialog}
			openDialog={openDialog}
			handleDelete={handleDelete}
			formatNumber={formatNumber}
		/>   
		</Container>
		</Box>	
	</>
	);
}
