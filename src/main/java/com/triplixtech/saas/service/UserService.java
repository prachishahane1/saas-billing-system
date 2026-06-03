package com.triplixtech.saas.service;

import com.triplixtech.saas.dto.LoginRequest;
import com.triplixtech.saas.entity.User;
import com.triplixtech.saas.repository.UserRepository;
import com.triplixtech.saas.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    // 1. Save User (Signup)
    public User saveUser(User user){
        return userRepository.save(user);
    }

    // 2. Get all users
    public List<User> getAllUsers(){
        return userRepository.findAll();
    }

    // 3. Get user by email (important for login)
    public User getByEmail(String email){
        return userRepository.findByEmail(email);
    }

    // 4. LOGIN + JWT TOKEN GENERATION
    public String login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail());

        if (user == null) {
            throw new RuntimeException("User not found");
        }

        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        // Generate JWT token
        return JwtUtil.generateToken(user.getEmail());
    }
}