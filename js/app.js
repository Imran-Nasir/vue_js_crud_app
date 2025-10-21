const { createApp } = Vue;

createApp({
    data() {
        return {
            bookings: [],
            currentBooking: {
                id: null,
                guestName: '',
                guestEmail: '',
                guestPhone: '',
                roomNumber: '',
                checkIn: '',
                checkOut: '',
                specialRequests: '',
                status: 'upcoming'
            },
            editingIndex: null,
            message: '',
            messageType: 'success',
            searchTerm: '',
            statusFilter: '',
            sortField: 'checkIn',
            sortDirection: 'asc',
            totalRooms: 20 // Total number of rooms in hotel
        }
    },
    
    computed: {
        isEditing() {
            return this.editingIndex !== null;
        },
        
        today() {
            return new Date().toISOString().split('T')[0];
        },
        
        // Get available rooms (not currently booked)
        availableRooms() {
            const bookedRooms = this.bookings
                .filter(booking => 
                    booking.status !== 'checked-out' && 
                    this.isBookingActive(booking)
                )
                .map(booking => booking.roomNumber);
            
            const allRooms = Array.from({length: this.totalRooms}, (_, i) => i + 1);
            return allRooms.filter(room => !bookedRooms.includes(room));
        },
        
        // Active bookings (checked-in)
        activeBookings() {
            return this.bookings.filter(booking => booking.status === 'checked-in');
        },
        
        // Upcoming bookings
        upcomingBookings() {
            return this.bookings.filter(booking => booking.status === 'upcoming');
        },
        
        // Filtered and sorted bookings
        filteredBookings() {
            let filtered = this.bookings;
            
            // Search filter
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                filtered = filtered.filter(booking => 
                    booking.guestName.toLowerCase().includes(term) ||
                    booking.guestEmail.toLowerCase().includes(term) ||
                    booking.roomNumber.toString().includes(term)
                );
            }
            
            // Status filter
            if (this.statusFilter) {
                filtered = filtered.filter(booking => booking.status === this.statusFilter);
            }
            
            // Sorting
            filtered = [...filtered].sort((a, b) => {
                let modifier = 1;
                if (this.sortDirection === 'desc') modifier = -1;
                
                if (a[this.sortField] < b[this.sortField]) return -1 * modifier;
                if (a[this.sortField] > b[this.sortField]) return 1 * modifier;
                return 0;
            });
            
            return filtered;
        }
    },
    
    methods: {
        // Create or Update booking
        saveBooking() {
            if (this.validateBooking()) {
                if (this.editingIndex === null) {
                    // Create new booking
                    const newBooking = {
                        ...this.currentBooking,
                        id: Date.now(), // Simple ID generation
                        status: 'upcoming'
                    };
                    this.bookings.push(newBooking);
                    this.showMessage('Booking created successfully! 🎉', 'success');
                } else {
                    // Update existing booking
                    this.bookings[this.editingIndex] = {...this.currentBooking};
                    this.showMessage('Booking updated successfully! ✅', 'success');
                }
                this.saveToLocalStorage();
                this.resetForm();
            }
        },

        // Read - Edit booking
        editBooking(index) {
            this.currentBooking = {...this.bookings[index]};
            this.editingIndex = index;
            this.scrollToTop();
        },

        // Delete booking
        deleteBooking(index) {
            const booking = this.bookings[index];
            if (confirm(`Are you sure you want to delete the booking for ${booking.guestName}?`)) {
                this.bookings.splice(index, 1);
                this.showMessage(`Booking for ${booking.guestName} deleted successfully! 🗑️`, 'success');
                this.saveToLocalStorage();
                
                if (this.editingIndex === index) {
                    this.resetForm();
                }
            }
        },

        // Check in guest
        checkIn(bookingId) {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (booking) {
                booking.status = 'checked-in';
                this.showMessage(`${booking.guestName} checked in successfully! ✅`, 'success');
                this.saveToLocalStorage();
            }
        },

        // Check out guest
        checkOut(bookingId) {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (booking) {
                booking.status = 'checked-out';
                this.showMessage(`${booking.guestName} checked out successfully! 🏁`, 'success');
                this.saveToLocalStorage();
            }
        },

        // Cancel editing
        cancelEdit() {
            this.resetForm();
            this.showMessage('Edit cancelled.', 'error');
        },

        // Reset form
        resetForm() {
            this.currentBooking = {
                id: null,
                guestName: '',
                guestEmail: '',
                guestPhone: '',
                roomNumber: '',
                checkIn: '',
                checkOut: '',
                specialRequests: '',
                status: 'upcoming'
            };
            this.editingIndex = null;
        },

        // Show message
        showMessage(text, type) {
            this.message = text;
            this.messageType = type;
            setTimeout(() => {
                this.message = '';
            }, 5000);
        },

        // Sort bookings
        sortBy(field) {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'asc';
            }
        },

        // Get original index from filtered array
        getOriginalIndex(filteredIndex) {
            const filteredBooking = this.filteredBookings[filteredIndex];
            return this.bookings.findIndex(booking => booking.id === filteredBooking.id);
        },

        // Validate booking data
        validateBooking() {
            if (!this.currentBooking.guestName.trim()) {
                this.showMessage('Please enter guest name.', 'error');
                return false;
            }
            
            if (!this.currentBooking.guestEmail.trim()) {
                this.showMessage('Please enter guest email.', 'error');
                return false;
            }
            
            // Simple email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.currentBooking.guestEmail)) {
                this.showMessage('Please enter a valid email address.', 'error');
                return false;
            }
            
            if (!this.currentBooking.guestPhone.trim()) {
                this.showMessage('Please enter guest phone number.', 'error');
                return false;
            }
            
            if (!this.currentBooking.roomNumber) {
                this.showMessage('Please select a room.', 'error');
                return false;
            }
            
            // Check if room is available (for new bookings)
            if (this.editingIndex === null && !this.availableRooms.includes(parseInt(this.currentBooking.roomNumber))) {
                this.showMessage('Selected room is not available. Please choose another room.', 'error');
                return false;
            }
            
            if (!this.currentBooking.checkIn) {
                this.showMessage('Please select check-in date.', 'error');
                return false;
            }
            
            if (!this.currentBooking.checkOut) {
                this.showMessage('Please select check-out date.', 'error');
                return false;
            }
            
            // Check if check-out is after check-in
            if (new Date(this.currentBooking.checkOut) <= new Date(this.currentBooking.checkIn)) {
                this.showMessage('Check-out date must be after check-in date.', 'error');
                return false;
            }
            
            return true;
        },

        // Check if booking is currently active (dates overlap with today)
        isBookingActive(booking) {
            const today = new Date();
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            
            return today >= checkIn && today <= checkOut;
        },

        // Format date for display
        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        // Format status for display
        formatStatus(status) {
            return status.replace('-', ' ');
        },

        // Get row class based on booking status
        getBookingRowClass(booking) {
            return booking.status;
        },

        // Save to localStorage
        saveToLocalStorage() {
            localStorage.setItem('hotel-bookings', JSON.stringify(this.bookings));
        },

        // Load from localStorage
        loadFromLocalStorage() {
            const savedBookings = localStorage.getItem('hotel-bookings');
            if (savedBookings) {
                this.bookings = JSON.parse(savedBookings);
            }
        },

        // Scroll to top of page
        scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },
    
    mounted() {
        this.loadFromLocalStorage();
        
        // Add sample data if no bookings exist
        if (this.bookings.length === 0) {
            const sampleCheckIn = new Date();
            sampleCheckIn.setDate(sampleCheckIn.getDate() + 1);
            
            const sampleCheckOut = new Date(sampleCheckIn);
            sampleCheckOut.setDate(sampleCheckOut.getDate() + 3);
            
            this.bookings = [
                {
                    id: 1,
                    guestName: 'John Smith',
                    guestEmail: 'john.smith@example.com',
                    guestPhone: '+1 (555) 123-4567',
                    roomNumber: 101,
                    checkIn: sampleCheckIn.toISOString().split('T')[0],
                    checkOut: sampleCheckOut.toISOString().split('T')[0],
                    specialRequests: 'Early check-in requested',
                    status: 'upcoming'
                },
                {
                    id: 2,
                    guestName: 'Maria Garcia',
                    guestEmail: 'maria.garcia@example.com',
                    guestPhone: '+1 (555) 987-6543',
                    roomNumber: 205,
                    checkIn: new Date().toISOString().split('T')[0],
                    checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    specialRequests: 'Vegetarian meals',
                    status: 'checked-in'
                }
            ];
            this.saveToLocalStorage();
        }
        
        console.log('Hotel Booking System loaded successfully! 🏨');
    }
}).mount('#app');