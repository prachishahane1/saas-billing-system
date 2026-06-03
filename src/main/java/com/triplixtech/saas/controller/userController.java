package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.User;
import com.triplixtech.saas.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping
    public User createUser(@RequestBody User user){
        return userService.saveUser(user);
    }

    @GetMapping
    public List<User> getAllUsers(){
        return userService.getAllUsers();
    }
}