package com.triplixtech.saas.repository;

import com.triplixtech.saas.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}