package com.triplixtech.saas.controller;

import com.triplixtech.saas.dto.SubscriptionRequest;
import com.triplixtech.saas.entity.Payment;
import com.triplixtech.saas.entity.Subscription;
import com.triplixtech.saas.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subscriptions")
public class SubscriptionController {

    @Autowired
    private SubscriptionService subscriptionService;

    @PostMapping
    public ResponseEntity<Subscription> create(@RequestBody Subscription subscription) {
        return ResponseEntity.ok(subscriptionService.saveSubscription(subscription));
    }

    @GetMapping
    public ResponseEntity<List<Subscription>> getAll() {
        return ResponseEntity.ok(subscriptionService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subscription> getById(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Subscription>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(subscriptionService.getByUser(userId));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Payment> subscribe(@RequestBody SubscriptionRequest request) {
        return ResponseEntity.ok(subscriptionService.subscribe(request));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Subscription> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.cancelSubscription(id));
    }

    @PostMapping("/{id}/upgrade")
    public ResponseEntity<Payment> upgrade(
            @PathVariable Long id,
            @RequestParam Long newPlanId,
            @RequestParam(defaultValue = "STRIPE") String gateway,
            @RequestParam(defaultValue = "USD") String currency) {
        return ResponseEntity.ok(subscriptionService.upgradeSubscription(id, newPlanId, gateway, currency));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        subscriptionService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }
}