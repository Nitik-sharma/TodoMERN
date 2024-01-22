document.addEventListener("click", (event) => {
  if (event.target.classList.contains("edit-me")) {
    const id = event.target.getAttribute("data-id");
    const newTodo = prompt("Enter new todo");

    console.log(id, newTodo);
    axios
      .post("/edit-todo", { id, newTodo })
      .then((res) => {
        if (res.data.status !== 200) alert(res.data.message);

        event.target.parentElement.parentElement.querySelector(
          ".item-text"
        ).innerHTML = newTodo;
        console.log(res);
        return;
      })
      .catch((err) => {
        alert(err);
        console.log(err);
      });
  } else if (event.target.classList.contains("delete-me")) {
    console.log("delete-me ");
    const id = event.target.getAttribute("data-id");

    axios
      .post("/delete-todo", { id })
      .then((res) => {
        console.log(res);
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }

        event.target.parentElement.parentElement.remove();
      })
      .catch((err) => {
        alert(err);
        console.log(err);
      });
  } else if (event.target.classList.contains("add_item")) {
    console.log("add");
    const todoText = document.getElementById("create_field").value;
    axios
      .post("/create-todo", { todo: todoText })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        document.getElementById("create_field").value = "";
        document.getElementById("item_list").insertAdjacentHTML(
          "beforeend",
          ` <li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between mb-2">
            <span class="item-text">${res.data.data.todo}</span>
            <div>
              <button data-id="${res.data.data._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
              <button data-id="${res.data.data._id}" class="delete-me btn btn-danger btn-sm ">Delete</button>
            </div>
            
            </li>`
        );
      })
      .catch((err) => {});
  }
});

window.onload = genrateTodo();

function genrateTodo() {
  axios
    .get("/read-todo")
    .then((res) => {
      console.log(res);
      if (res.data.status !== 200) {
        alert(res.data.message);
      }
      const todos = res.data.data;
      console.log(todos);
      document.getElementById("item_list").insertAdjacentHTML(
        "beforeend",
        todos
          .map((item) => {
            return ` <li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between mb-2">
            <span class="item-text">${item.todo}</span>
            <div>
              <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
              <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm ">Delete</button>
            </div>
            
            </li>`;
          })
          .join("")
      );
      return;
    })
    .catch((error) => {
      console.log(error);
      return;
    });
}
