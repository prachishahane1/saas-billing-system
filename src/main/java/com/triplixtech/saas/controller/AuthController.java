package com.triplixtech.saas.controller;

import com.triplixtech.saas.dto.LoginRequest;
import com.triplixtech.saas.dto.LoginResponse;
import com.triplixtech.saas.dto.SignupRequest;
import com.triplixtech.saas.entity.Organization;
import com.triplixtech.saas.entity.User;
import com.triplixtech.saas.service.OrganizationService;
import com.triplixtech.saas.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private OrganizationService organizationService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        if (userService.getByEmail(request.getEmail()) != null) {
            return ResponseEntity.badRequest().body("Email is already in use");
        }

        Organization org = null;
        if (request.getOrgName() != null && !request.getOrgName().trim().isEmpty()) {
            org = new Organization();
            org.setOrgName(request.getOrgName());
            org.setStatus("ACTIVE");
            org.setCreatedAt(LocalDateTime.now());
            org = organizationService.saveOrganization(org);
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setStatus("ACTIVE");
        user.setCreatedAt(LocalDateTime.now());
        
        // Match roles: SUPER_ADMIN, ORGANIZATION_ADMIN, USER
        String role = request.getRole();
        if (role == null || role.trim().isEmpty()) {
            role = (org != null) ? "ORGANIZATION_ADMIN" : "USER";
        } else {
            role = role.toUpperCase();
            if (!role.equals("SUPER_ADMIN") && !role.equals("ORGANIZATION_ADMIN") && !role.equals("USER")) {
                role = "USER";
            }
        }
        user.setRole(role);
        user.setOrganization(org);

        User savedUser = userService.saveUser(user);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            String token = userService.login(request);
            User user = userService.getByEmail(request.getEmail());

            LoginResponse response = new LoginResponse(
                    token,
                    user.getUserId(),
                    user.getEmail(),
                    user.getName(),
                    user.getRole(),
                    user.getOrganization() != null ? user.getOrganization().getOrganizationId() : null,
                    user.getOrganization() != null ? user.getOrganization().getOrgName() : null
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody java.util.Map<String, String> payload) {
        String idToken = payload.get("idToken");
        if (idToken == null || idToken.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Token is required");
        }

        try {
            String email;
            String name;

            // Check if it's a simulated token (for local developer demo)
            if ("SIMULATED_GOOGLE_TOKEN".equalsIgnoreCase(idToken)) {
                email = "google.user@gmail.com";
                name = "Google Sandbox User";
            } else {
                // Call Google Token Info Endpoint to verify the signature & claims
                String tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                java.util.Map<?, ?> googleClaims = restTemplate.getForObject(tokenInfoUrl, java.util.Map.class);

                if (googleClaims == null || googleClaims.get("error_description") != null) {
                    return ResponseEntity.status(401).body("Invalid Google Identity Token");
                }

                email = (String) googleClaims.get("email");
                name = (String) googleClaims.get("name");
            }

            if (email == null) {
                return ResponseEntity.badRequest().body("Email not returned by Google provider");
            }

            // Check if user exists. If not, auto-register them
            User user = userService.getByEmail(email);
            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setName(name);
                user.setPassword(java.util.UUID.randomUUID().toString()); // Random password
                user.setStatus("ACTIVE");
                user.setCreatedAt(LocalDateTime.now());
                user.setRole("USER");
                
                // Create a mock personal organization tenant
                Organization org = new Organization();
                org.setOrgName(name + "'s Team");
                org.setStatus("ACTIVE");
                org.setCreatedAt(LocalDateTime.now());
                org = organizationService.saveOrganization(org);
                
                user.setOrganization(org);
                user = userService.saveUser(user);
            }

            // Generate our own local secure JWT token
            String localToken = com.triplixtech.saas.security.JwtUtil.generateToken(user.getEmail(), user.getRole());

            LoginResponse response = new LoginResponse(
                    localToken,
                    user.getUserId(),
                    user.getEmail(),
                    user.getName(),
                    user.getRole(),
                    user.getOrganization() != null ? user.getOrganization().getOrganizationId() : null,
                    user.getOrganization() != null ? user.getOrganization().getOrgName() : null
            );

            return ResponseEntity.ok(response);

        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Google Authentication error: " + ex.getMessage());
        }
    }
}
