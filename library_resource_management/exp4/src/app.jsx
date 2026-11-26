import React, { useEffect, useState } from "react";
import "./style.css";

export default function App() {
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [totalUpdates, setTotalUpdates] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editResource, setEditResource] = useState("Book");
  const [editPurpose, setEditPurpose] = useState("Borrow");

  // Load user records from user.json and update counts from count.json
  async function fetchUsersAndCounts() {
    try {
      const [usersResponse, countsResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/counts")
      ]);

      if (!usersResponse.ok || !countsResponse.ok) {
        throw new Error("Could not load user records or counts.");
      }

      const usersData = await usersResponse.json();
      const countsData = await countsResponse.json();

      setUsers(usersData);
      setCounts(countsData);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("Unable to connect to Express server. Make sure server.js is running.");
    }
  }

  useEffect(function () {
    fetchUsersAndCounts();
  }, []);

  // Increment update count for a user directly on button click
  async function handleUpdateUser(user, overrides) {
    setErrorMessage("");
    try {
      const response = await fetch("/api/exp4/users/" + encodeURIComponent(user.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides || {
          name: user.name,
          email: user.email,
          resource: user.resource,
          purpose: user.purpose
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Update failed.");
        return;
      }

      // Update local state with returned user and incremented count
      setUsers(function (prevUsers) {
        return prevUsers.map(function (item) {
          return item.id === user.id ? data.user : item;
        });
      });

      setCounts(function (prevCounts) {
        return {
          ...prevCounts,
          [user.id]: data.count
        };
      });

      setThankYouMessage(data.message);
      setTotalUpdates(data.count);
      setEditingUser(null);
    } catch (error) {
      setErrorMessage("Error updating user record.");
    }
  }

  function startEditing(user) {
    setEditingUser(user);
    setEditName(user.name);
    setEditResource(user.resource);
    setEditPurpose(user.purpose);
    setErrorMessage("");
  }

  function handleEditSubmit(event) {
    event.preventDefault();
    if (!editName.trim()) {
      setErrorMessage("User name cannot be empty.");
      return;
    }
    if (editName.trim().length > 40) {
      setErrorMessage("User name cannot exceed 40 characters.");
      return;
    }

    handleUpdateUser(editingUser, {
      name: editName.trim(),
      email: editingUser.email,
      resource: editResource,
      purpose: editPurpose
    });
  }

  return (
    <div className="lrm-container">
      <h1 className="lrm-title">Library Resource Management</h1>
      <p className="lrm-subtitle">Experiment 4: React.js Update Counter</p>

      {thankYouMessage && (
        <div className="lrm-banner" role="status">
          <p><strong>{thankYouMessage}</strong></p>
          <p>Total updates: {totalUpdates}</p>
        </div>
      )}

      {errorMessage && <div className="lrm-error">{errorMessage}</div>}

      {users.length === 0 ? (
        <p>No user records found in user.json.</p>
      ) : (
        <table className="lrm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Resource</th>
              <th>Purpose</th>
              <th>Update Count</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(function (user) {
              const userCount = counts[user.id] || 0;
              return (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.resource}</td>
                  <td>{user.purpose}</td>
                  <td>{userCount}</td>
                  <td>
                    <button
                      type="button"
                      className="lrm-btn"
                      onClick={function () {
                        handleUpdateUser(user);
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="lrm-btn lrm-btn-secondary"
                      onClick={function () {
                        startEditing(user);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editingUser && (
        <div className="lrm-edit-box">
          <h2>Edit Record: {editingUser.id}</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="lrm-form-group">
              <label htmlFor="editName">Name:</label>
              <input
                id="editName"
                type="text"
                value={editName}
                onChange={function (e) {
                  setEditName(e.target.value);
                }}
              />
            </div>

            <div className="lrm-form-group">
              <label htmlFor="editResource">Resource:</label>
              <select
                id="editResource"
                value={editResource}
                onChange={function (e) {
                  setEditResource(e.target.value);
                }}
              >
                <option value="Book">Book</option>
                <option value="Journal">Journal</option>
                <option value="Magazine">Magazine</option>
              </select>
            </div>

            <div className="lrm-form-group">
              <label htmlFor="editPurpose">Purpose:</label>
              <select
                id="editPurpose"
                value={editPurpose}
                onChange={function (e) {
                  setEditPurpose(e.target.value);
                }}
              >
                <option value="Borrow">Borrow</option>
                <option value="Return">Return</option>
              </select>
            </div>

            <button type="submit" className="lrm-btn">
              Save &amp; Update
            </button>
            <button
              type="button"
              className="lrm-btn lrm-btn-secondary"
              onClick={function () {
                setEditingUser(null);
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
