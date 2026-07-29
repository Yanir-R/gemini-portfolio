# What the heck are callbacks? Promises? Async/await? What a MESS

My goal in this post series is to help you get a better understanding of this large concept by looking at many different perspectives and explanations. I hope you find it helpful in getting a better understanding of what asynchronous is and why you need to understand it.

But first, let's start from the very beginning. Let's dive in (:

JavaScript is a single threaded programming language. OK… let's try again.

JavaScript uses the single thread runtime, which means one thing is done at a time. In other words, it can run one piece of code at a time and must finish executing it before moving on to the next.

## So how does JS handle asynchronous operations?

So, the fact is JavaScript is a single threaded programming language **but the JavaScript runtime is definitely not**.

For a clearer picture of how the JS runtime works, we need to understand first what the stack and the heap are.

### Stack memory

- The stack is a place in computer memory where all the variables that are declared and initialized before runtime are stored.
- It is used to store static data, where the engine knows the size at compile time. In JS this includes primitive values (string, numbers, booleans, and so on).
- The stack is much faster than the heap, but also smaller and more expensive.

![The stack drawn as a neat ordered pile, the heap as scattered blocks in no particular order](/writing/async-stack-heap.png)

### Memory heap

- The heap is the section of computer memory where all the variables created or initialized at runtime are stored.
- It is a different place for storing data like objects and variables.
- The heap is more flexible than the stack. That's because memory space for the heap can be dynamically allocated and de-allocated as needed.

Here are the two storages compared side by side for the table lovers <:

![Stack and heap compared: primitive values and references against objects and functions, size known at compile time against run time, a fixed allocation against no limit per object](/writing/async-stack-heap-table.png)

So, in conclusion, we need the memory heap as a place to store and write information, and the stack helps us keep track of where we are in the code so that we can run the code in order.

I learned this from some other great articles I want to mention here as well:

- [JavaScript memory management](https://felixgerschau.com/javascript-memory-management/)
- [What and where are the stack and heap?](https://stackoverflow.com/questions/79923/what-and-where-are-the-stack-and-heap)
- [Asynchronous adventures in JavaScript: understanding the event loop](https://medium.com/@BenDiuguid/asynchronous-adventures-in-javascript-understanding-the-event-loop-fc6f968d5f72)

Hope you find this post useful, and in the next post we'll continue diving into how the V8 engine works and how it helps us (:

> **Yanir**, web developer incredibly passionate about JS, coding daily with React and NodeJS.

## Kind
article

## Source
Medium

## URL
https://medium.com/@Yanir_Rot/what-the-heck-are-callbacks-promises-async-await-what-a-mess-cabd0d594b94

## Date
2022-03-05

## Media
/writing/async-hero.jpg

## Summary
JavaScript runs one thing at a time, and its runtime does not. Where the stack ends and the heap begins, and why the difference is what makes asynchronous code possible at all.
