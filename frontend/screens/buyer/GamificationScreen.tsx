import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../../lib/ThemeContext";
import { useTranslation } from "../../lib/i18n/useTranslation";
import { Ionicons } from "@expo/vector-icons";
import { getBuyerDeviceId } from "../../lib/buyerDeviceId";
import { buttonPress } from "../../lib/haptics";

type Props = {
  navigation: any;
};

const BADGE_ICONS: Record<string, string> = {
  first_order: "ribbon",
  loyal_5: "star",
  loyal_10: "trophy",
  big_spender: "diamond",
  reviewer: "chatbox",
  referrer: "people",
  early_bird: "sunny",
  night_owl: "moon",
};

export default function GamificationScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  const allBadges = useQuery(api.gamification.getAllBadges);
  const userBadges = useQuery(
    api.gamification.getUserBadges,
    buyerDeviceId ? { buyerDeviceId } : "skip"
  );
  const progress = useQuery(
    api.gamification.getUserProgress,
    buyerDeviceId ? { buyerDeviceId } : "skip"
  );

  const isLoading = !allBadges || !progress;
  const earnedBadgeIds = new Set(progress?.earnedBadges || []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => {
            buttonPress();
            navigation.goBack();
          }}
          style={styles.backButton}
          data-testid="gamification-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("gamification.achievements")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Level Card */}
          <View style={[styles.levelCard, { backgroundColor: colors.primary }]}>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelLabel}>{t("gamification.currentLevel")}</Text>
                <Text style={styles.levelNumber}>{progress?.level || 1}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Ionicons name="shield" size={48} color="rgba(255,255,255,0.9)" />
                <Text style={styles.levelBadgeText}>{progress?.level || 1}</Text>
              </View>
            </View>
            
            {/* XP Progress Bar */}
            <View style={styles.xpContainer}>
              <View style={styles.xpLabels}>
                <Text style={styles.xpText}>XP: {progress?.xp || 0}</Text>
                <Text style={styles.xpText}>{progress?.nextLevelXp || 500}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${((progress?.xp || 0) / (progress?.nextLevelXp || 500)) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.nextLevelText}>
                {t("gamification.nextLevel")}: {(progress?.level || 1) + 1}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="bag-check" size={24} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progress?.ordersCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Замовлень
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="cash" size={24} color="#10B981" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progress?.totalSpent || 0} kr
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Витрачено
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="chatbubbles" size={24} color="#F59E0B" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progress?.reviewsCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Відгуків
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="people" size={24} color="#8B5CF6" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progress?.referralsCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Рефералів
              </Text>
            </View>
          </View>

          {/* Badges Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("gamification.badges")} ({earnedBadgeIds.size}/{allBadges?.length || 0})
          </Text>

          <View style={styles.badgesGrid}>
            {allBadges?.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              const earnedBadge = userBadges?.find(ub => ub.badgeId === badge.id);
              
              return (
                <View 
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    { 
                      backgroundColor: colors.card,
                      opacity: isEarned ? 1 : 0.5,
                    }
                  ]}
                >
                  <View 
                    style={[
                      styles.badgeIcon,
                      { 
                        backgroundColor: isEarned 
                          ? colors.primary + "20" 
                          : colors.textSecondary + "20" 
                      }
                    ]}
                  >
                    <Ionicons 
                      name={BADGE_ICONS[badge.id] as any || "help"} 
                      size={32} 
                      color={isEarned ? colors.primary : colors.textSecondary} 
                    />
                    {isEarned && (
                      <View style={[styles.checkmark, { backgroundColor: "#10B981" }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  
                  <Text 
                    style={[
                      styles.badgeName, 
                      { color: isEarned ? colors.text : colors.textSecondary }
                    ]}
                    numberOfLines={2}
                  >
                    {badge.name}
                  </Text>
                  
                  <Text 
                    style={[styles.badgeDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {badge.description}
                  </Text>
                  
                  {isEarned && earnedBadge && (
                    <Text style={[styles.earnedDate, { color: colors.primary }]}>
                      {new Date(earnedBadge.earnedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  levelCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  levelLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 4,
  },
  levelNumber: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "800",
  },
  levelBadge: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: {
    position: "absolute",
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  xpContainer: {
    marginTop: 8,
  },
  xpLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  xpText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  nextLevelText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badgeCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  checkmark: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 11,
    textAlign: "center",
  },
  earnedDate: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: "500",
  },
});
